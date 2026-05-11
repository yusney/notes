using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Notes.Infrastructure.Auth.OAuthProviders;

namespace Notes.Infrastructure.Tests.Auth;

/// <summary>
/// Unit tests for GoogleOAuthProvider using inline HttpMessageHandler mock.
/// </summary>
public class GoogleOAuthProviderTests
{
    private static HttpClient MakeClient(params (string Url, object Response)[] endpoints)
    {
        var handler = new FakeHttpMessageHandler(endpoints);
        return new HttpClient(handler);
    }

    [Fact]
    public async Task ExchangeCodeAsync_ValidCode_ReturnsAccessToken()
    {
        // Arrange
        var tokenPayload = new { access_token = "goog-access-token", refresh_token = "goog-refresh" };
        var client = MakeClient(("https://oauth2.googleapis.com/token", tokenPayload));
        var provider = new GoogleOAuthProvider(client, "client-id", "client-secret");

        // Act
        var result = await provider.ExchangeCodeAsync("auth-code", "https://app/callback");

        // Assert
        Assert.Equal("goog-access-token", result.AccessToken);
        Assert.Equal("goog-refresh", result.RefreshToken);
    }

    [Fact]
    public async Task GetUserInfoAsync_ReturnsUserInfo()
    {
        // Triangulation: userinfo returns correct fields
        var userInfoPayload = new { sub = "google-sub-123", email = "alice@gmail.com", name = "Alice" };
        var client = MakeClient(("https://www.googleapis.com/oauth2/v3/userinfo", userInfoPayload));
        var provider = new GoogleOAuthProvider(client, "client-id", "client-secret");

        var result = await provider.GetUserInfoAsync("access-token");

        Assert.Equal("google-sub-123", result.ProviderId);
        Assert.Equal("alice@gmail.com", result.Email);
        Assert.Equal("Alice", result.DisplayName);
    }
}

/// <summary>
/// Unit tests for GitHubOAuthProvider, including secondary emails endpoint.
/// </summary>
public class GitHubOAuthProviderTests
{
    private static HttpClient MakeClient(params (string Url, object Response)[] endpoints)
    {
        var handler = new FakeHttpMessageHandler(endpoints);
        return new HttpClient(handler);
    }

    [Fact]
    public async Task ExchangeCodeAsync_ValidCode_ReturnsAccessToken()
    {
        var tokenPayload = new { access_token = "gh-access-token" };
        var client = MakeClient(("https://github.com/login/oauth/access_token", tokenPayload));
        var provider = new GitHubOAuthProvider(client, "client-id", "client-secret");

        var result = await provider.ExchangeCodeAsync("code", "https://app/callback");

        Assert.Equal("gh-access-token", result.AccessToken);
        Assert.Null(result.RefreshToken);
    }

    [Fact]
    public async Task GetUserInfoAsync_WithPublicEmail_ReturnsUserInfo()
    {
        // Triangulation: user with public email — no secondary call needed
        var userPayload = new { id = 42L, login = "alice", name = "Alice", email = "alice@example.com" };
        var client = MakeClient(("https://api.github.com/user", userPayload));
        var provider = new GitHubOAuthProvider(client, "client-id", "client-secret");

        var result = await provider.GetUserInfoAsync("access-token");

        Assert.Equal("42", result.ProviderId);
        Assert.Equal("alice@example.com", result.Email);
        Assert.Equal("alice", result.DisplayName);
    }

    [Fact]
    public async Task GetUserInfoAsync_WithPrivateEmail_FetchesFromEmailsEndpoint()
    {
        // Triangulation: user with private email — secondary /user/emails call is made
        var userPayload = new { id = 99L, login = "bob", name = "Bob", email = (string?)null };
        var emailsPayload = new[]
        {
            new { email = "bob@private.com", primary = true, verified = true }
        };

        var client = MakeClient(
            ("https://api.github.com/user", userPayload),
            ("https://api.github.com/user/emails", emailsPayload));
        var provider = new GitHubOAuthProvider(client, "client-id", "client-secret");

        var result = await provider.GetUserInfoAsync("access-token");

        Assert.Equal("99", result.ProviderId);
        Assert.Equal("bob@private.com", result.Email);
    }
}

/// <summary>
/// Minimal fake HttpMessageHandler that returns pre-configured JSON responses by URL prefix.
/// Longer URLs are matched first to avoid prefix ambiguity (e.g. /user vs /user/emails).
/// </summary>
internal sealed class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly List<(string Url, string Json)> _responses;

    public FakeHttpMessageHandler(IEnumerable<(string Url, object Response)> endpoints)
    {
        // Sort by URL length descending so more-specific URLs match first
        _responses = endpoints
            .Select(e => (e.Url, JsonSerializer.Serialize(e.Response)))
            .OrderByDescending(e => e.Url.Length)
            .ToList();
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var url = request.RequestUri?.ToString() ?? string.Empty;
        var match = _responses.FirstOrDefault(e => url.StartsWith(e.Url, StringComparison.OrdinalIgnoreCase));

        if (match.Json is null)
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));

        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(match.Json, Encoding.UTF8, "application/json")
        };
        return Task.FromResult(response);
    }
}
