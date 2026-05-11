using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

public class UserControllerTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public UserControllerTests(NotesApiFactory factory)
    {
        _factory = factory;
    }

    // ── GET /api/user/profile ─────────────────────────────────────────────────

    [Fact]
    public async Task GetProfile_Authenticated_Returns200WithProfile()
    {
        var client = await AuthenticatedClientAsync("Profile User");

        var response = await client.GetAsync("/api/user/profile");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("displayName").GetString().Should().Be("Profile User");
        body.TryGetProperty("email", out _).Should().BeTrue();
    }

    [Fact]
    public async Task GetProfile_Unauthenticated_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/user/profile");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── PUT /api/user/profile ─────────────────────────────────────────────────

    [Fact]
    public async Task UpdateProfile_ValidDisplayName_Returns200WithUpdatedProfile()
    {
        var client = await AuthenticatedClientAsync("Old Name");

        var response = await client.PutAsJsonAsync("/api/user/profile", new
        {
            displayName = "New Name"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("displayName").GetString().Should().Be("New Name");
    }

    [Fact]
    public async Task UpdateProfile_EmptyDisplayName_Returns400()
    {
        var client = await AuthenticatedClientAsync("Some User");

        var response = await client.PutAsJsonAsync("/api/user/profile", new
        {
            displayName = ""
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── PUT /api/user/password ────────────────────────────────────────────────

    [Fact]
    public async Task ChangePassword_CorrectCurrentPassword_Returns204()
    {
        var client = await AuthenticatedClientAsync("Pass User");

        var response = await client.PutAsJsonAsync("/api/user/password", new
        {
            currentPassword = "SecurePass1!",
            newPassword = "NewSecurePass1!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_Returns400()
    {
        var client = await AuthenticatedClientAsync("Pass User 2");

        var response = await client.PutAsJsonAsync("/api/user/password", new
        {
            currentPassword = "WrongPassword1!",
            newPassword = "NewSecurePass1!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── GET /api/user/preferences ─────────────────────────────────────────────

    [Fact]
    public async Task GetPreferences_Authenticated_Returns200WithDefaults()
    {
        var client = await AuthenticatedClientAsync("Prefs User");

        var response = await client.GetAsync("/api/user/preferences");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("theme", out _).Should().BeTrue();
        body.TryGetProperty("sortBy", out _).Should().BeTrue();
        body.TryGetProperty("sortOrder", out _).Should().BeTrue();
    }

    [Fact]
    public async Task GetPreferences_Unauthenticated_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/user/preferences");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── PUT /api/user/preferences ─────────────────────────────────────────────

    [Fact]
    public async Task UpdatePreferences_ValidRequest_Returns200WithUpdated()
    {
        var client = await AuthenticatedClientAsync("Prefs Update User");

        var response = await client.PutAsJsonAsync("/api/user/preferences", new
        {
            theme = 1,      // Dark
            sortBy = 1,     // UpdatedAt
            sortOrder = 0   // Asc
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("theme", out _).Should().BeTrue();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<HttpClient> AuthenticatedClientAsync(string displayName = "Test User")
    {
        var client = _factory.CreateClient();
        var email = $"user_{Guid.NewGuid():N}@example.com";

        var regResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "SecurePass1!",
            displayName
        });
        var regBody = await regResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = regBody.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        return client;
    }
}
