using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Pages;

/// <summary>
/// Tests covering verify-report warnings:
/// W1 — expired token returns 404 page (ExpiresAt in the past)
/// W2 — title XSS attempt is HTML-encoded in rendered output (Razor auto-encode)
/// W4 — UpdatedAt null vs non-null branches in the Index view
/// </summary>
public class SharedNoteWarningFixTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public SharedNoteWarningFixTests(NotesApiFactory factory) => _factory = factory;

    // ── W1: Expired token → 404 page ─────────────────────────────────────────

    [Fact]
    public async Task SharedNotePage_ExpiredToken_Returns404Page()
    {
        // Arrange — create note, share it with ExpiresAt already in the past
        var (authClient, tabId) = await ClientWithTabAsync("expired");

        var noteResp = await authClient.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Expiry Test Note",
            content = "<p>Will expire</p>",
            language = "en"
        });
        noteResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        // Pass ExpiresAt set to one day in the past — link is immediately expired
        var expiredAt = DateTime.UtcNow.AddDays(-1);
        var shareResp = await authClient.PostAsJsonAsync($"/api/notes/{noteId}/share", new
        {
            expiresAt = expiredAt
        });
        shareResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var shareBody = await shareResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = shareBody.GetProperty("token").GetString()!;

        // Act — anonymous client requests the expired link
        var anonClient = _factory.CreateClient();
        var pageResp = await anonClient.GetAsync($"/s/{token}");
        var html = await pageResp.Content.ReadAsStringAsync();

        // Assert — expired link must return 404, same as not-found
        pageResp.StatusCode.Should().Be(HttpStatusCode.NotFound,
            "an expired token must return 404 (SharedLink.IsActive returns false when ExpiresAt < now)");
        html.Should().Contain("no longer available",
            "the NotFound page must render for expired tokens");
    }

    // ── W2: Title XSS attempt is HTML-encoded in rendered output ─────────────

    [Fact]
    public async Task SharedNotePage_TitleWithXssPayload_IsSafelyEncodedInHtml()
    {
        // Arrange — create a note whose title contains an XSS attempt.
        // Razor's @ViewData["Title"] uses Html.Encode automatically (unlike @Html.Raw),
        // so the script tag must appear as HTML entities, never as raw markup.
        var (authClient, tabId) = await ClientWithTabAsync("title-xss");

        var xssTitle = "<script>alert('xss')</script>Evil Title";

        var noteResp = await authClient.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = xssTitle,
            content = "<p>Safe content</p>",
            language = "en"
        });
        noteResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        var shareResp = await authClient.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });
        var shareBody = await shareResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = shareBody.GetProperty("token").GetString()!;

        // Act — anonymous GET of the Razor page
        var anonClient = _factory.CreateClient();
        var pageResp = await anonClient.GetAsync($"/s/{token}");
        var html = await pageResp.Content.ReadAsStringAsync();

        // Assert — Razor encodes @ViewData["Title"] so <script> must not appear raw in <title>
        pageResp.StatusCode.Should().Be(HttpStatusCode.OK);
        html.Should().NotContain("<script>alert('xss')</script>",
            "Razor must HTML-encode @ViewData[\"Title\"], preventing raw script injection in <title>");
        // The encoded form &lt;script&gt; must be present instead
        html.Should().Contain("&lt;script&gt;",
            "the XSS payload in the title must appear as HTML entities, not raw tags");
    }

    // ── W4: UpdatedAt null branch — 'Updated' span must not render ───────────

    [Fact]
    public async Task SharedNotePage_NoteNeverUpdated_DoesNotRenderUpdatedDate()
    {
        // Arrange — create a brand-new note (UpdatedAt is null on creation)
        var (authClient, tabId) = await ClientWithTabAsync("no-updatedat");

        var noteResp = await authClient.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Never Updated Note",
            content = "<p>Original content only.</p>",
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

        // Assert — @if (Model.Note.UpdatedAt.HasValue) must suppress the Updated span.
        // We match "&middot; Updated" which is the exact span rendered by the view template
        // when UpdatedAt is non-null.  This avoids false positives from the word "Updated"
        // appearing in note titles or Open Graph meta tags.
        pageResp.StatusCode.Should().Be(HttpStatusCode.OK);
        html.Should().NotContain("middot",
            "the '· Updated' date span (which uses &middot;) must not render when UpdatedAt is null");
        html.Should().Contain("Created",
            "the Created date must still be rendered");
    }

    // ── W4: UpdatedAt non-null branch — 'Updated' span must render ───────────

    [Fact]
    public async Task SharedNotePage_NoteAfterUpdate_RendersUpdatedDate()
    {
        // Arrange — create a note then update it so UpdatedAt becomes non-null
        var (authClient, tabId) = await ClientWithTabAsync("with-updatedat");

        var noteResp = await authClient.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Note To Be Updated",
            content = "<p>Original content.</p>",
            language = "en"
        });
        noteResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        // Update the note — this sets UpdatedAt = DateTime.UtcNow via Note.Update()
        var updateResp = await authClient.PutAsJsonAsync($"/api/notes/{noteId}", new
        {
            title = "Note To Be Updated",
            content = "<p>Edited content.</p>",
            tagNames = Array.Empty<string>()
        });
        updateResp.IsSuccessStatusCode.Should().BeTrue(
            "updating the note must succeed so UpdatedAt becomes non-null");

        var shareResp = await authClient.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });
        var shareBody = await shareResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = shareBody.GetProperty("token").GetString()!;

        // Act
        var anonClient = _factory.CreateClient();
        var pageResp = await anonClient.GetAsync($"/s/{token}");
        var html = await pageResp.Content.ReadAsStringAsync();

        // Assert — @if (Model.Note.UpdatedAt.HasValue) must render the Updated span.
        // Match "&middot; Updated" — the exact pattern in the view template.
        pageResp.StatusCode.Should().Be(HttpStatusCode.OK);
        html.Should().Contain("middot",
            "the '· Updated' date span (which uses &middot;) must render when UpdatedAt is non-null");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(HttpClient client, string tabId)> ClientWithTabAsync(string tag)
    {
        var client = _factory.CreateClient();
        var email = $"warn-fix-{tag}-{Guid.NewGuid():N}@example.com";

        var registerResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "P@ssword123!",
            displayName = "Warning Fix Test User"
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
