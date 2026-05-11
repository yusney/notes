using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

/// <summary>
/// Tests for the new endpoints added to NotesController in the user-experience change:
/// - PUT /api/notes/{id}/favorite
/// - GET /api/notes with sortBy, sortOrder, isFavoriteOnly query params
/// </summary>
public class NotesControllerFavoriteTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public NotesControllerFavoriteTests(NotesApiFactory factory)
    {
        _factory = factory;
    }

    // ── PUT /api/notes/{id}/favorite ──────────────────────────────────────────

    [Fact]
    public async Task ToggleFavorite_ExistingNote_Returns200WithFavoriteStatus()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var noteId = await CreateNoteAsync(client, tabId, "Fav Note");

        var response = await client.PutAsync($"/api/notes/{noteId}/favorite", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("isFavorite").GetBoolean().Should().BeTrue();
        body.TryGetProperty("id", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ToggleFavorite_NonExistingNote_Returns404()
    {
        var (client, _) = await ClientWithTabAsync();

        var response = await client.PutAsync($"/api/notes/{Guid.NewGuid()}/favorite", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── GET /api/notes with sort/filter params ────────────────────────────────

    [Fact]
    public async Task GetNotes_WithSortByParam_Returns200()
    {
        var (client, tabId) = await ClientWithTabAsync();
        await CreateNoteAsync(client, tabId, "Sort Test Note");

        var response = await client.GetAsync("/api/notes?sortBy=1&sortOrder=0");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("items").EnumerateArray().Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public async Task GetNotes_IsFavoriteOnlyTrue_ReturnsOnlyFavorites()
    {
        var (client, tabId) = await ClientWithTabAsync();

        // Create two notes, favorite only one
        var noteId1 = await CreateNoteAsync(client, tabId, "Fav");
        await CreateNoteAsync(client, tabId, "Not Fav");
        await client.PutAsync($"/api/notes/{noteId1}/favorite", null);

        var response = await client.GetAsync("/api/notes?isFavoriteOnly=true");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = body.GetProperty("items").EnumerateArray().ToList();
        items.Should().HaveCount(1);
        items[0].GetProperty("title").GetString().Should().Be("Fav");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(HttpClient Client, Guid TabId)> ClientWithTabAsync()
    {
        var client = _factory.CreateClient();
        var email = $"favtest_{Guid.NewGuid():N}@example.com";

        var regResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "SecurePass1!",
            displayName = "Fav Test User"
        });
        var regBody = await regResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = regBody.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

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
