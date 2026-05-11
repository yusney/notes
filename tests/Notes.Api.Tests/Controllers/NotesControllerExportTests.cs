using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

public class NotesControllerExportTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public NotesControllerExportTests(NotesApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ExportNotes_Authenticated_ReturnsZipFile()
    {
        var (client, tabId) = await ClientWithTabAsync();

        // Create two notes
        await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Note Alpha",
            content = "Content of Alpha",
            language = "en"
        });
        await client.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Note Beta",
            content = "Content of Beta",
            language = "en"
        });

        var response = await client.GetAsync("/api/notes/export");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/zip");

        var bytes = await response.Content.ReadAsByteArrayAsync();
        bytes.Should().NotBeEmpty();

        // Parse ZIP and verify entries
        using var stream = new MemoryStream(bytes);
        using var zip = new ZipArchive(stream, ZipArchiveMode.Read);
        zip.Entries.Should().HaveCount(2);
        zip.Entries.All(e => e.Name.EndsWith(".md")).Should().BeTrue();

        // Verify frontmatter in at least one entry
        var firstEntry = zip.Entries.First(e => e.Name.Contains("alpha", StringComparison.OrdinalIgnoreCase)
            || e.Name.Contains("note", StringComparison.OrdinalIgnoreCase));
        using var reader = new StreamReader(firstEntry.Open());
        var content = await reader.ReadToEndAsync();
        content.Should().Contain("---");
        content.Should().Contain("title:");
        content.Should().Contain("createdAt:");
    }

    [Fact]
    public async Task ExportNotes_Unauthenticated_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/notes/export");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ExportNotes_EmptyNotes_ReturnsEmptyZip()
    {
        var client = await AuthenticatedClientAsync();

        var response = await client.GetAsync("/api/notes/export");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/zip");

        var bytes = await response.Content.ReadAsByteArrayAsync();
        using var stream = new MemoryStream(bytes);
        using var zip = new ZipArchive(stream, ZipArchiveMode.Read);
        zip.Entries.Should().BeEmpty();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<System.Net.Http.HttpClient> AuthenticatedClientAsync()
    {
        var client = _factory.CreateClient();
        var email = $"export-{Guid.NewGuid():N}@test.com";
        var reg = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "Secret123!",
            displayName = "Export User"
        });
        var loginBody = await reg.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var token = loginBody.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<(System.Net.Http.HttpClient, Guid)> ClientWithTabAsync()
    {
        var client = await AuthenticatedClientAsync();
        var tabsResp = await client.GetAsync("/api/tabs");
        var tabsBody = await tabsResp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var tabId = Guid.Parse(tabsBody.EnumerateArray().First().GetProperty("id").GetString()!);
        return (client, tabId);
    }
}
