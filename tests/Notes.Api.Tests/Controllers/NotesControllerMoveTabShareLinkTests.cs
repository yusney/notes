using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

/// <summary>
/// Spec gap #2: "Share Link Is Tab-Agnostic"
///
/// Proves that moving a note between tabs does NOT revoke or alter its share link.
/// After a PUT /tab, the existing share token MUST still resolve to the same note content.
/// </summary>
public class NotesControllerMoveTabShareLinkTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public NotesControllerMoveTabShareLinkTests(NotesApiFactory factory) => _factory = factory;

    [Fact]
    public async Task MoveNote_AfterShareLinkCreated_ShareLinkStillResolvesToOriginalContent()
    {
        var client = _factory.CreateClient();
        var email = $"sharemove_{Guid.NewGuid():N}@example.com";

        var regResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "SecurePass1!",
            displayName = "Share Move User"
        });
        var regBody = await regResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = regBody.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Default tab + create a second tab to move into
        var tabsResp = await client.GetAsync("/api/tabs");
        var tabsBody = await tabsResp.Content.ReadFromJsonAsync<JsonElement>();
        var sourceTabId = Guid.Parse(tabsBody.EnumerateArray().First().GetProperty("id").GetString()!);

        var newTabResp = await client.PostAsJsonAsync("/api/tabs", new { name = "Moved To" });
        var newTabBody = await newTabResp.Content.ReadFromJsonAsync<JsonElement>();
        var destTabId = Guid.Parse(newTabBody.GetProperty("id").GetString()!);

        // Create a note with distinctive content
        var noteContent = $"Move-safe content {Guid.NewGuid():N}";
        var noteResp = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId = sourceTabId,
            title = "Moveable Shared Note",
            content = noteContent,
            language = "en"
        });
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        // Create a share link
        var shareResp = await client.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });
        var shareBody = await shareResp.Content.ReadFromJsonAsync<JsonElement>();
        var shareToken = shareBody.GetProperty("token").GetString()!;

        // MOVE the note to the other tab
        var moveResp = await client.PutAsJsonAsync($"/api/notes/{noteId}/tab", new { tabId = destTabId });
        moveResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Resolve share link as an anonymous client — content MUST be unchanged
        var anonClient = _factory.CreateClient();
        var publicResp = await anonClient.GetAsync($"/share/{shareToken}");
        publicResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var publicBody = await publicResp.Content.ReadFromJsonAsync<JsonElement>();
        publicBody.GetProperty("title").GetString().Should().Be("Moveable Shared Note");
        publicBody.GetProperty("content").GetString().Should().Be(noteContent);
    }
}