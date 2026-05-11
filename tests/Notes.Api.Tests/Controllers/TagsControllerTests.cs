using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

public class TagsControllerTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public TagsControllerTests(NotesApiFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient client, string userId)> AuthenticatedClientAsync()
    {
        var client = _factory.CreateClient();
        var email = $"tag-user-{Guid.NewGuid():N}@test.com";
        var regResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            displayName = "Tag User",
            email,
            password = "TestPass123!"
        });

        var body = await regResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = body.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return (client, email);
    }

    [Fact]
    public async Task GetTags_Authenticated_ReturnsEmptyList()
    {
        var (client, _) = await AuthenticatedClientAsync();

        var response = await client.GetAsync("/api/tags");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var tags = await response.Content.ReadFromJsonAsync<JsonElement>();
        tags.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task CreateTag_ValidName_Returns201WithId()
    {
        var (client, _) = await AuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/tags", new { name = "important" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("id", out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateTag_ThenGetTags_ReturnsCreatedTag()
    {
        var (client, _) = await AuthenticatedClientAsync();
        await client.PostAsJsonAsync("/api/tags", new { name = "mywork" });

        var response = await client.GetAsync("/api/tags");
        var tags = await response.Content.ReadFromJsonAsync<JsonElement>();

        var tagList = tags.EnumerateArray().ToList();
        tagList.Should().ContainSingle(t => t.GetProperty("name").GetString() == "mywork");
    }

    [Fact]
    public async Task DeleteTag_ExistingTag_Returns204()
    {
        var (client, _) = await AuthenticatedClientAsync();
        var createResp = await client.PostAsJsonAsync("/api/tags", new { name = "todelete" });
        var body = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var tagId = body.GetProperty("id").GetString();

        var deleteResp = await client.DeleteAsync($"/api/tags/{tagId}");

        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task CreateTag_Unauthenticated_Returns401()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/tags", new { name = "test" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
