using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

public class TabsControllerTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public TabsControllerTests(NotesApiFactory factory)
    {
        _factory = factory;
    }

    // ── GET /api/tabs ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTabs_Authenticated_ReturnsListWithDefaultTab()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.GetAsync("/api/tabs");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = body.EnumerateArray().ToList();
        items.Should().HaveCountGreaterThan(0, "default 'General' tab is created on register");
    }

    [Fact]
    public async Task GetTabs_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/tabs");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── POST /api/tabs ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateTab_ValidRequest_Returns201WithId()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/tabs", new { name = "Work" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("id").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task CreateTab_EmptyName_Returns400()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/tabs", new { name = "" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── DELETE /api/tabs/{id} ─────────────────────────────────────────────────

    [Fact]
    public async Task DeleteTab_ExistingTab_Returns204()
    {
        var client = await AuthenticatedClientAsync();

        // Create a tab to delete
        var createResp = await client.PostAsJsonAsync("/api/tabs", new { name = "ToDelete" });
        var body = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var tabId = body.GetProperty("id").GetString();

        var response = await client.DeleteAsync($"/api/tabs/{tabId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteTab_NonExistingTab_Returns404()
    {
        var client = await AuthenticatedClientAsync();
        var response = await client.DeleteAsync($"/api/tabs/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var httpClient = _factory.CreateClient();
        var email = $"tabs_{Guid.NewGuid():N}@example.com";

        var resp = await httpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "SecurePass1!",
            displayName = "Tabs User"
        });

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var token = body.GetProperty("accessToken").GetString()!;

        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        return httpClient;
    }
}
