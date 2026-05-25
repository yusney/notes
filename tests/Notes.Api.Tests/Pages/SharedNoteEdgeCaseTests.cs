using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Pages;

/// <summary>
/// Integration tests for edge cases: empty note content and revoked share tokens.
/// RED phase: written against existing production code to verify spec behaviour.
/// </summary>
public class SharedNoteEdgeCaseTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public SharedNoteEdgeCaseTests(NotesApiFactory factory) => _factory = factory;

    // ── Empty content: renders without error ─────────────────────────────────

    [Fact]
    public async Task SharedNotePage_NoteWithEmptyContent_Renders200WithTitle()
    {
        // Arrange — create a note with empty content string
        var (authClient, tabId) = await ClientWithTabAsync();

        var noteResp = await authClient.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Empty Content Note",
            content = "",
            language = "en"
        });
        noteResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        var shareResp = await authClient.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });
        var shareBody = await shareResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = shareBody.GetProperty("token").GetString()!;

        // Act
        var anonClient = _factory.CreateClient();
        var pageResp = await anonClient.GetAsync($"/s/{token}");
        var html = await pageResp.Content.ReadAsStringAsync();

        // Assert — page renders without error; title must appear
        pageResp.StatusCode.Should().Be(HttpStatusCode.OK,
            "an empty-content note must render the page, not crash");
        html.Should().Contain("Empty Content Note",
            "the note title must still be rendered for an empty-content note");
    }

    // ── Revoked token: returns 404 page (same as not-found) ──────────────────

    [Fact]
    public async Task SharedNotePage_RevokedToken_Returns404Page()
    {
        // Arrange — create note, share it, then revoke the link
        var (authClient, tabId) = await ClientWithTabAsync();

        var noteResp = await authClient.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Note To Revoke",
            content = "<p>Will be revoked</p>",
            language = "en"
        });
        noteResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        var shareResp = await authClient.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });
        var shareBody = await shareResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = shareBody.GetProperty("token").GetString()!;

        // Revoke the share link via the authenticated API
        var revokeResp = await authClient.DeleteAsync($"/api/shared-links/{token}");
        revokeResp.StatusCode.Should().Be(HttpStatusCode.NoContent,
            "revoking an active link should return 204");

        // Act — anonymous client follows the redirect to the NotFound page
        var anonClient = _factory.CreateClient();
        var pageResp = await anonClient.GetAsync($"/s/{token}");
        var html = await pageResp.Content.ReadAsStringAsync();

        // Assert — same 404 NotFound page as any other invalid/expired token
        pageResp.StatusCode.Should().Be(HttpStatusCode.NotFound,
            "a revoked token must return 404 (same as not-found)");
        html.Should().Contain("no longer available",
            "the NotFound page message must appear for revoked tokens");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(HttpClient client, string tabId)> ClientWithTabAsync()
    {
        var client = _factory.CreateClient();
        var email = $"edge-case-{Guid.NewGuid():N}@example.com";

        var registerResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "P@ssword123!",
            displayName = "Edge Case Test User"
        });
        registerResp.StatusCode.Should().Be(HttpStatusCode.Created);

        var registerBody = await registerResp.Content.ReadFromJsonAsync<JsonElement>();
        var jwtToken = registerBody.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", jwtToken);

        var tabsResp = await client.GetAsync("/api/tabs");
        var tabsBody = await tabsResp.Content.ReadFromJsonAsync<JsonElement>();
        var tabId = tabsBody.EnumerateArray().First().GetProperty("id").GetString()!;

        return (client, tabId);
    }
}
