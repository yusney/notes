using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Notes.Api.Controllers;

namespace Notes.Api.Tests.Controllers;

public class AuthControllerTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;
    private readonly HttpClient _client;

    public AuthControllerTests(NotesApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ── POST /api/auth/register ───────────────────────────────────────────────

    [Fact]
    public async Task Register_ValidRequest_Returns201WithTokens()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email = $"user_{Guid.NewGuid():N}@example.com",
            password = "SecurePass1!",
            displayName = "Test User"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("refreshToken").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Register_InvalidEmail_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "not-an-email",
            password = "SecurePass1!",
            displayName = "Test"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("errors", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns400()
    {
        var email = $"dup_{Guid.NewGuid():N}@example.com";

        // First registration
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "SecurePass1!",
            displayName = "User One"
        });

        // Duplicate
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "SecurePass1!",
            displayName = "User Two"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── POST /api/auth/login ──────────────────────────────────────────────────

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithTokens()
    {
        var email = $"login_{Guid.NewGuid():N}@example.com";
        const string password = "SecurePass1!";

        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email, password, displayName = "Login User"
        });

        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email, password
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("refreshToken").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_InvalidCredentials_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "nonexistent@example.com",
            password = "WrongPass!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── POST /api/auth/refresh ────────────────────────────────────────────────

    [Fact]
    public async Task Refresh_ValidToken_Returns200WithNewTokens()
    {
        var email = $"refresh_{Guid.NewGuid():N}@example.com";

        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            await RegisterAndGetCredentials(email));

        var loginBody = await loginResp.Content.ReadFromJsonAsync<JsonElement>();
        var refreshToken = loginBody.GetProperty("refreshToken").GetString()!;

        var response = await _client.PostAsJsonAsync("/api/auth/refresh", new
        {
            token = refreshToken
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Refresh_InvalidToken_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/refresh", new
        {
            token = "this-is-not-a-valid-refresh-token"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── POST /api/auth/logout ─────────────────────────────────────────────────

    [Fact]
    public async Task Logout_AuthenticatedUser_Returns204()
    {
        var email = $"logout_{Guid.NewGuid():N}@example.com";
        var tokens = await RegisterAndGetTokens(email);
        var client = ClientWithBearer(tokens.AccessToken);

        var response = await client.PostAsync("/api/auth/logout", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<object> RegisterAndGetCredentials(string email)
    {
        const string password = "SecurePass1!";
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email, password, displayName = "Helper User"
        });
        return new { email, password };
    }

    private async Task<(string AccessToken, string RefreshToken)> RegisterAndGetTokens(string email)
    {
        const string password = "SecurePass1!";
        var resp = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email, password, displayName = "Helper"
        });
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return (
            body.GetProperty("accessToken").GetString()!,
            body.GetProperty("refreshToken").GetString()!
        );
    }

    private HttpClient ClientWithBearer(string token)
    {
        // Use factory.CreateClient() — NOT new HttpClient() — to route through
        // the in-process test server instead of the real network.
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
