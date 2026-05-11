using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

public class NotesControllerTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public NotesControllerTests(NotesApiFactory factory)
    {
        _factory = factory;
    }

    // ── GET /api/notes ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetNotes_Authenticated_ReturnsPagedResult()
    {
        var (client, tabId) = await ClientWithTabAsync();

        // Create a note first
        await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Test Note",
            content = "Some content",
            language = "en"
        });

        var response = await client.GetAsync("/api/notes");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("items").EnumerateArray().Should().HaveCountGreaterThan(0);
        body.TryGetProperty("totalCount", out _).Should().BeTrue();
    }

    [Fact]
    public async Task GetNotes_Unauthenticated_Returns401()
    {
        var response = _factory.CreateClient().GetAsync("/api/notes");
        (await response).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── GET /api/notes/{id} ───────────────────────────────────────────────────

    [Fact]
    public async Task GetNote_ExistingId_Returns200WithNote()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var createResp = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "My Note",
            content = "Hello world",
            language = "en"
        });
        var createBody = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = createBody.GetProperty("id").GetString();

        var response = await client.GetAsync($"/api/notes/{noteId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("title").GetString().Should().Be("My Note");
    }

    [Fact]
    public async Task GetNote_NonExistingId_Returns404()
    {
        var (client, _) = await ClientWithTabAsync();
        var response = await client.GetAsync($"/api/notes/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST /api/notes ───────────────────────────────────────────────────────

    [Fact]
    public async Task CreateNote_ValidRequest_Returns201WithId()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var response = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "New Note",
            content = "Content here",
            language = "en"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("id").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task CreateNote_WithTagNames_AssociatesTagsInNoteDetail()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var response = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Tagged Note",
            content = "Content here",
            language = "en",
            tagNames = new[] { "work", "important" }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var createBody = await response.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = createBody.GetProperty("id").GetString();

        var detailResp = await client.GetAsync($"/api/notes/{noteId}");
        detailResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var detailBody = await detailResp.Content.ReadFromJsonAsync<JsonElement>();
        var tags = detailBody.GetProperty("tags").EnumerateArray().Select(t => t.GetProperty("name").GetString()).ToList();
        tags.Should().BeEquivalentTo("work", "important");
    }

    [Fact]
    public async Task CreateNote_EmptyTitle_Returns400()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var response = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "",
            content = "Content",
            language = "en"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── PUT /api/notes/{id} ───────────────────────────────────────────────────

    [Fact]
    public async Task UpdateNote_ValidRequest_Returns204()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var createResp = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Original",
            content = "Original content",
            language = "en"
        });
        var body = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = body.GetProperty("id").GetString();

        var response = await client.PutAsJsonAsync($"/api/notes/{noteId}", new
        {
            title = "Updated Title",
            content = "Updated content"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UpdateNote_WithTagNames_AssociatesTagsInNoteDetail()
    {
        var (client, tabId) = await ClientWithTabAsync();

        var createResp = await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Original",
            content = "Original content",
            language = "en"
        });
        var body = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = body.GetProperty("id").GetString();

        var response = await client.PutAsJsonAsync($"/api/notes/{noteId}", new
        {
            title = "Updated Title",
            content = "Updated content",
            tagNames = new[] { "project" }
        });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var detailResp = await client.GetAsync($"/api/notes/{noteId}");
        detailResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var detailBody = await detailResp.Content.ReadFromJsonAsync<JsonElement>();
        var tags = detailBody.GetProperty("tags").EnumerateArray().Select(t => t.GetProperty("name").GetString()).ToList();
        tags.Should().BeEquivalentTo("project");
    }

    [Fact]
    public async Task UpdateNote_NonExistingId_Returns404()
    {
        var (client, _) = await ClientWithTabAsync();

        var response = await client.PutAsJsonAsync($"/api/notes/{Guid.NewGuid()}", new
        {
            title = "Title",
            content = "Content"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(HttpClient Client, Guid TabId)> ClientWithTabAsync()
    {
        var httpClient = _factory.CreateClient();
        var email = $"notes_{Guid.NewGuid():N}@example.com";

        var regResp = await httpClient.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "SecurePass1!",
            displayName = "Notes User"
        });
        var regBody = await regResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = regBody.GetProperty("accessToken").GetString()!;
        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        // Get the default tab
        var tabsResp = await httpClient.GetAsync("/api/tabs");
        var tabsBody = await tabsResp.Content.ReadFromJsonAsync<JsonElement>();
        var tabId = Guid.Parse(tabsBody.EnumerateArray().First().GetProperty("id").GetString()!);

        return (httpClient, tabId);
    }
}
