using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

/// <summary>
/// Integration tests for OAuth redirect + callback endpoints.
/// GET /api/auth/oauth/google
/// GET /api/auth/oauth/google/callback
/// GET /api/auth/oauth/github
/// GET /api/auth/oauth/github/callback
/// </summary>
public class AuthController_OAuthTests : IClassFixture<NotesApiFactory>
{
    private readonly HttpClient _client;

    public AuthController_OAuthTests(NotesApiFactory factory)
    {
        // Don't follow redirects — we want to assert 302 headers
        _client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    // ── GET /api/auth/oauth/google ────────────────────────────────────────────

    [Fact]
    public async Task GoogleRedirect_Returns302ToGoogleOAuthUrl()
    {
        var response = await _client.GetAsync("/api/auth/oauth/google");

        response.StatusCode.Should().Be(HttpStatusCode.Redirect);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.Host.Should().Contain("accounts.google.com");
    }

    // ── GET /api/auth/oauth/github ────────────────────────────────────────────

    [Fact]
    public async Task GitHubRedirect_Returns302ToGitHubOAuthUrl()
    {
        var response = await _client.GetAsync("/api/auth/oauth/github");

        response.StatusCode.Should().Be(HttpStatusCode.Redirect);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.Host.Should().Contain("github.com");
    }

    // ── GET /api/auth/oauth/google/callback (missing code) ───────────────────

    [Fact]
    public async Task GoogleCallback_MissingCode_Returns400()
    {
        // No 'code' query parameter — OAuth error scenario
        var response = await _client.GetAsync("/api/auth/oauth/google/callback?error=access_denied");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── GET /api/auth/oauth/github/callback (missing code) ───────────────────

    [Fact]
    public async Task GitHubCallback_MissingCode_Returns400()
    {
        var response = await _client.GetAsync("/api/auth/oauth/github/callback?error=access_denied");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
