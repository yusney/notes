using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

/// <summary>
/// Tests for PUT /api/notes/{id}/tab — Move Note Between Tabs (change #9).
///
/// Scenarios covered:
///   - Valid move → 204, GET shows note in destination tab
///   - Target tab not owned by caller → 404
///   - Note not owned by caller → 404
///   - Empty/missing tabId in body → 400
///   - Same-tab move → 204, note unchanged
/// </summary>
public class NotesControllerMoveTabTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public NotesControllerMoveTabTests(NotesApiFactory factory) => _factory = factory;

    [Fact]
    public async Task MoveNote_ValidRequest_Returns204_AndNoteEndsUpInTargetTab()
    {
        var (client, sourceTabId, destTabId) = await ClientWithTwoTabsAsync();
        var noteId = await CreateNoteAsync(client, sourceTabId, "To Be Moved");

        var response = await client.PutAsJsonAsync($"/api/notes/{noteId}/tab", new { tabId = destTabId });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // GET the note back; verify tabId = destTabId
        var detailResp = await client.GetAsync($"/api/notes/{noteId}");
        detailResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailBody = await detailResp.Content.ReadFromJsonAsync<JsonElement>();
        var actualTabId = detailBody.GetProperty("tabId").GetString();
        actualTabId.Should().Be(destTabId.ToString());
    }

    [Fact]
    public async Task MoveNote_TargetTabNotOwned_Returns404()
    {
        // Caller owns sourceTab, but tries to move into a tab owned by another user.
        var caller = await ClientWithTwoTabsAsync();
        var outsider = await ClientWithOneTabAsync();
        var noteId = await CreateNoteAsync(caller.Client, caller.SourceTabId, "Stolen Target");

        var response = await caller.Client.PutAsJsonAsync(
            $"/api/notes/{noteId}/tab",
            new { tabId = outsider.TabId });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // Note stays in source tab
        var detail = await caller.Client.GetAsync($"/api/notes/{noteId}");
        var body = await detail.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("tabId").GetString().Should().Be(caller.SourceTabId.ToString());
    }

    [Fact]
    public async Task MoveNote_NoteNotOwned_Returns404()
    {
        // Outsider tries to move a note that belongs to the original user.
        var owner = await ClientWithOneTabAsync();
        var outsider = await ClientWithOneTabAsync();
        var noteId = await CreateNoteAsync(owner.Client, owner.TabId, "Note I Should Not Touch");

        var response = await outsider.Client.PutAsJsonAsync(
            $"/api/notes/{noteId}/tab",
            new { tabId = outsider.TabId });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // Note still in original tab
        var detail = await owner.Client.GetAsync($"/api/notes/{noteId}");
        var body = await detail.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("tabId").GetString().Should().Be(owner.TabId.ToString());
    }

    [Fact]
    public async Task MoveNote_MissingTabIdInBody_Returns400()
    {
        var (client, sourceTabId, _) = await ClientWithTwoTabsAsync();
        var noteId = await CreateNoteAsync(client, sourceTabId, "Will Stay Put");

        // tabId is Guid.Empty — equivalent to "missing/empty body" — must be rejected.
        var response = await client.PutAsJsonAsync(
            $"/api/notes/{noteId}/tab",
            new { tabId = Guid.Empty });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task MoveNote_SameTabMove_Returns204_NoMutation()
    {
        var (client, sourceTabId, _) = await ClientWithTwoTabsAsync();
        var noteId = await CreateNoteAsync(client, sourceTabId, "Same Tab Move");

        // Move to the same tab
        var response = await client.PutAsJsonAsync(
            $"/api/notes/{noteId}/tab",
            new { tabId = sourceTabId });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Note still in same tab
        var detail = await client.GetAsync($"/api/notes/{noteId}");
        var body = await detail.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("tabId").GetString().Should().Be(sourceTabId.ToString());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(HttpClient Client, Guid SourceTabId, Guid DestTabId)> ClientWithTwoTabsAsync()
    {
        var (client, defaultTabId) = await ClientWithOneTabAsync();
        var createResp = await client.PostAsJsonAsync("/api/tabs", new { name = "Second Tab" });
        var createBody = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var destTabId = Guid.Parse(createBody.GetProperty("id").GetString()!);
        return (client, defaultTabId, destTabId);
    }

    private async Task<(HttpClient Client, Guid TabId)> ClientWithOneTabAsync()
    {
        var client = _factory.CreateClient();
        var email = $"movetest_{Guid.NewGuid():N}@example.com";

        var regResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "SecurePass1!",
            displayName = "Move Test User"
        });
        var regBody = await regResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = regBody.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var tabsResp = await client.GetAsync("/api/tabs");
        var tabsBody = await tabsResp.Content.ReadFromJsonAsync<JsonElement>();
        var tabId = Guid.Parse(tabsBody.EnumerateArray().First().GetProperty("id").GetString()!);

        return (client, tabId);
    }

    private async Task<string> CreateNoteAsync(HttpClient client, Guid tabId, string title)
    {
        var resp = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title,
            content = "Content",
            language = "en"
        });
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetString()!;
    }
}