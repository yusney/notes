using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

/// <summary>
/// Integration tests for SharedLinksController and PublicNotesController.
/// </summary>
public class SharedLinksControllerTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public SharedLinksControllerTests(NotesApiFactory factory) => _factory = factory;

    // ── POST /api/notes/{noteId}/share ────────────────────────────────────────

    [Fact]
    public async Task CreateShareLink_ValidNote_Returns201WithToken()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var noteResponse = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Shareable Note",
            content = "Note content here",
            language = "en"
        });
        noteResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var noteBody = await noteResponse.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        var shareResponse = await client.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });

        shareResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var shareBody = await shareResponse.Content.ReadFromJsonAsync<JsonElement>();
        var token = shareBody.GetProperty("token").GetString()!;
        token.Should().NotBeNullOrEmpty();
        token.Length.Should().Be(21);
    }

    [Fact]
    public async Task CreateShareLink_Unauthenticated_Returns401()
    {
        var response = await _factory.CreateClient()
            .PostAsJsonAsync($"/api/notes/{Guid.NewGuid()}/share", new { });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── GET /share/{token} (Public) ───────────────────────────────────────────

    [Fact]
    public async Task GetPublicShare_ValidToken_Returns200WithNoteContent()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var noteResp = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Public Note Title",
            content = "Public note content",
            language = "en"
        });
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        var shareResp = await client.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });
        var shareBody = await shareResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = shareBody.GetProperty("token").GetString()!;

        // Anonymous client
        var publicClient = _factory.CreateClient();
        var publicResp = await publicClient.GetAsync($"/share/{token}");

        publicResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var publicBody = await publicResp.Content.ReadFromJsonAsync<JsonElement>();
        publicBody.GetProperty("title").GetString().Should().Be("Public Note Title");
        publicBody.GetProperty("content").GetString().Should().Be("Public note content");
    }

    [Fact]
    public async Task GetPublicShare_NonExistentToken_Returns404()
    {
        var publicClient = _factory.CreateClient();
        var response = await publicClient.GetAsync("/share/nonexistent-token-xyz");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── DELETE /api/shared-links/{token} ─────────────────────────────────────

    [Fact]
    public async Task RevokeShareLink_ValidToken_Returns204()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var noteResp = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Revocable Note",
            content = "Content",
            language = "en"
        });
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        var shareResp = await client.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });
        var shareBody = await shareResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = shareBody.GetProperty("token").GetString()!;

        var revokeResp = await client.DeleteAsync($"/api/shared-links/{token}");
        revokeResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetPublicShare_RevokedToken_Returns404()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var noteResp = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Will Be Revoked",
            content = "Content",
            language = "en"
        });
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        var shareResp = await client.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });
        var shareBody = await shareResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = shareBody.GetProperty("token").GetString()!;

        await client.DeleteAsync($"/api/shared-links/{token}");

        var publicClient = _factory.CreateClient();
        var publicResp = await publicClient.GetAsync($"/share/{token}");
        publicResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── GET /api/shared-links ─────────────────────────────────────────────────

    [Fact]
    public async Task GetSharedLinks_Authenticated_ReturnsList()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var noteResp = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Note For Listing",
            content = "Content",
            language = "en"
        });
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        await client.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });

        var listResp = await client.GetAsync("/api/shared-links");
        listResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var listBody = await listResp.Content.ReadFromJsonAsync<JsonElement>();
        listBody.GetArrayLength().Should().BeGreaterThan(0);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(HttpClient client, string tabId)> ClientWithTabAsync()
    {
        var client = _factory.CreateClient();
        var email = $"share-user-{Guid.NewGuid():N}@example.com";

        var registerResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "P@ssword123!",
            displayName = "Share User"
        });

        var registerBody = await registerResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = registerBody.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Get the default tab created on register
        var tabsResp = await client.GetAsync("/api/tabs");
        var tabsBody = await tabsResp.Content.ReadFromJsonAsync<JsonElement>();
        var tabId = tabsBody.EnumerateArray().First().GetProperty("id").GetString()!;

        return (client, tabId);
    }
}
