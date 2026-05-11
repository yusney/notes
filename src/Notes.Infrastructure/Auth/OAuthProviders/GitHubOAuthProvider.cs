using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Notes.Application.Common.Interfaces;

namespace Notes.Infrastructure.Auth.OAuthProviders;

/// <summary>
/// GitHub OAuth 2.0 provider.
/// Requires secondary call to /user/emails when primary email is private.
/// </summary>
public sealed class GitHubOAuthProvider : IOAuthProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _clientId;
    private readonly string _clientSecret;

    private const string AuthBaseUrl = "https://github.com/login/oauth/authorize";
    private const string TokenEndpoint = "https://github.com/login/oauth/access_token";
    private const string UserEndpoint = "https://api.github.com/user";
    private const string UserEmailsEndpoint = "https://api.github.com/user/emails";

    public string Name => "github";

    public GitHubOAuthProvider(HttpClient httpClient, string clientId, string clientSecret)
    {
        _httpClient = httpClient;
        _clientId = clientId;
        _clientSecret = clientSecret;
    }

    public string BuildAuthorizationUrl(string state, string redirectUri)
    {
        var query = System.Web.HttpUtility.ParseQueryString(string.Empty);
        query["client_id"] = _clientId;
        query["redirect_uri"] = redirectUri;
        query["scope"] = "user:email";
        query["state"] = state;
        return $"{AuthBaseUrl}?{query}";
    }

    public async Task<OAuthTokenResponse> ExchangeCodeAsync(
        string code, string redirectUri, CancellationToken ct = default)
    {
        var payload = new Dictionary<string, string>
        {
            ["client_id"] = _clientId,
            ["client_secret"] = _clientSecret,
            ["code"] = code,
            ["redirect_uri"] = redirectUri
        };

        var request = new HttpRequestMessage(HttpMethod.Post, TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(payload)
        };
        request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var data = await response.Content.ReadFromJsonAsync<GitHubTokenResponse>(cancellationToken: ct)
                   ?? throw new InvalidOperationException("Failed to deserialize GitHub token response.");

        return new OAuthTokenResponse(data.AccessToken, null);
    }

    public async Task<OAuthUserInfo> GetUserInfoAsync(string accessToken, CancellationToken ct = default)
    {
        var userRequest = new HttpRequestMessage(HttpMethod.Get, UserEndpoint);
        userRequest.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        userRequest.Headers.UserAgent.ParseAdd("notes-app/1.0");

        var userResponse = await _httpClient.SendAsync(userRequest, ct);
        userResponse.EnsureSuccessStatusCode();

        var userData = await userResponse.Content.ReadFromJsonAsync<GitHubUserResponse>(cancellationToken: ct)
                       ?? throw new InvalidOperationException("Failed to deserialize GitHub user response.");

        // GitHub may return null email if profile email is private — fetch from /user/emails
        var email = userData.Email ?? await FetchPrimaryEmailAsync(accessToken, ct);

        return new OAuthUserInfo(
            userData.Id.ToString(),
            email,
            userData.Login ?? userData.Name ?? email);
    }

    private async Task<string> FetchPrimaryEmailAsync(string accessToken, CancellationToken ct)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, UserEmailsEndpoint);
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        request.Headers.UserAgent.ParseAdd("notes-app/1.0");

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var emails = await response.Content.ReadFromJsonAsync<List<GitHubEmailEntry>>(
                         new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                         cancellationToken: ct)
                     ?? throw new InvalidOperationException("Failed to fetch GitHub emails.");

        return emails.FirstOrDefault(e => e.Primary && e.Verified)?.Email
               ?? emails.FirstOrDefault()?.Email
               ?? throw new InvalidOperationException("No verified email found in GitHub account.");
    }

    private sealed record GitHubTokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken);
}

// File-scoped types — accessible to System.Text.Json via the assembly
internal sealed record GitHubUserResponse(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("login")] string? Login,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("email")] string? Email);

internal sealed record GitHubEmailEntry(
    [property: JsonPropertyName("email")] string Email,
    [property: JsonPropertyName("primary")] bool Primary,
    [property: JsonPropertyName("verified")] bool Verified);
