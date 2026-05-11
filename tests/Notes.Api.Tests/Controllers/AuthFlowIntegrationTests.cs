using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

/// <summary>
/// End-to-end flow: register → login → refresh → logout
/// </summary>
public class AuthFlowIntegrationTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;
    private readonly HttpClient _client;

    public AuthFlowIntegrationTests(NotesApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task FullAuthFlow_RegisterLoginRefreshLogout_Succeeds()
    {
        var email = $"flow_{Guid.NewGuid():N}@example.com";
        const string password = "SecurePass1!";

        // ── 1. Register ────────────────────────────────────────────────────────
        var registerResp = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email, password, displayName = "Flow User"
        });
        registerResp.StatusCode.Should().Be(HttpStatusCode.Created, "register should succeed");
        var registerBody = await registerResp.Content.ReadFromJsonAsync<JsonElement>();
        var accessToken1 = registerBody.GetProperty("accessToken").GetString()!;
        accessToken1.Should().NotBeNullOrEmpty();

        // ── 2. Login ───────────────────────────────────────────────────────────
        var loginResp = await _client.PostAsJsonAsync("/api/auth/login", new { email, password });
        loginResp.StatusCode.Should().Be(HttpStatusCode.OK, "login should succeed");
        var loginBody = await loginResp.Content.ReadFromJsonAsync<JsonElement>();
        var refreshToken = loginBody.GetProperty("refreshToken").GetString()!;
        var accessToken2 = loginBody.GetProperty("accessToken").GetString()!;
        refreshToken.Should().NotBeNullOrEmpty();
        accessToken2.Should().NotBeNullOrEmpty();

        // ── 3. Refresh ─────────────────────────────────────────────────────────
        var refreshResp = await _client.PostAsJsonAsync("/api/auth/refresh", new { token = refreshToken });
        refreshResp.StatusCode.Should().Be(HttpStatusCode.OK, "refresh should succeed");
        var refreshBody = await refreshResp.Content.ReadFromJsonAsync<JsonElement>();
        var accessToken3 = refreshBody.GetProperty("accessToken").GetString()!;
        accessToken3.Should().NotBeNullOrEmpty();

        // ── 4. Logout ─────────────────────────────────────────────────────────
        // Use factory.CreateClient() — NOT new HttpClient() — so requests route
        // through the in-process test server instead of the real network.
        var authedClient = _factory.CreateClient();
        authedClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", accessToken3);

        var logoutResp = await authedClient.PostAsync("/api/auth/logout", null);
        logoutResp.StatusCode.Should().Be(HttpStatusCode.NoContent, "logout should succeed");
    }
}
