using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

/// <summary>
/// Integration tests for complete user-experience flows:
/// - register → login → update profile → change password → get preferences → update preferences
/// - create note → toggle favorite → filter by favorites → sort notes
/// </summary>
public class UserExperienceFlowIntegrationTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public UserExperienceFlowIntegrationTests(NotesApiFactory factory)
    {
        _factory = factory;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Flow 1: User profile + preferences lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UserProfileFlow_RegisterLoginUpdateProfileChangePasswordUpdatePreferences_Succeeds()
    {
        var email = $"flow_{Guid.NewGuid():N}@example.com";
        const string password = "SecurePass1!";
        const string newPassword = "NewSecurePass2!";

        // ── 1. Register ────────────────────────────────────────────────────────
        var client = _factory.CreateClient();
        var regResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password,
            displayName = "Original Name"
        });
        regResp.StatusCode.Should().Be(HttpStatusCode.Created, "register should succeed");
        var regBody = await regResp.Content.ReadFromJsonAsync<JsonElement>();
        var accessToken = regBody.GetProperty("accessToken").GetString()!;
        accessToken.Should().NotBeNullOrEmpty();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", accessToken);

        // ── 2. Get profile (verify initial state) ─────────────────────────────
        var profileResp = await client.GetAsync("/api/user/profile");
        profileResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var profileBody = await profileResp.Content.ReadFromJsonAsync<JsonElement>();
        profileBody.GetProperty("displayName").GetString().Should().Be("Original Name");
        profileBody.GetProperty("email").GetString().Should().Be(email);

        // ── 3. Update profile ─────────────────────────────────────────────────
        var updateProfileResp = await client.PutAsJsonAsync("/api/user/profile", new
        {
            displayName = "Updated Name"
        });
        updateProfileResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedProfile = await updateProfileResp.Content.ReadFromJsonAsync<JsonElement>();
        updatedProfile.GetProperty("displayName").GetString().Should().Be("Updated Name");

        // ── 4. Verify profile update persisted ────────────────────────────────
        var verifyResp = await client.GetAsync("/api/user/profile");
        verifyResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var verifyBody = await verifyResp.Content.ReadFromJsonAsync<JsonElement>();
        verifyBody.GetProperty("displayName").GetString().Should().Be("Updated Name");

        // ── 5. Change password ────────────────────────────────────────────────
        var changePwdResp = await client.PutAsJsonAsync("/api/user/password", new
        {
            currentPassword = password,
            newPassword
        });
        changePwdResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // ── 6. Login with new password ────────────────────────────────────────
        var loginClient = _factory.CreateClient();
        var loginResp = await loginClient.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = newPassword
        });
        loginResp.StatusCode.Should().Be(HttpStatusCode.OK, "login with new password should succeed");
        var loginBody = await loginResp.Content.ReadFromJsonAsync<JsonElement>();
        var newToken = loginBody.GetProperty("accessToken").GetString()!;
        newToken.Should().NotBeNullOrEmpty();
        loginClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", newToken);

        // ── 7. Get preferences (verify defaults) ──────────────────────────────
        var prefsResp = await loginClient.GetAsync("/api/user/preferences");
        prefsResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var prefsBody = await prefsResp.Content.ReadFromJsonAsync<JsonElement>();
        prefsBody.TryGetProperty("theme", out var themeEl).Should().BeTrue();
        prefsBody.TryGetProperty("sortBy", out _).Should().BeTrue();
        prefsBody.TryGetProperty("sortOrder", out _).Should().BeTrue();
        // Default theme is System (0)
        themeEl.GetString().Should().Be("system");

        // ── 8. Update preferences ─────────────────────────────────────────────
        var updatePrefsResp = await loginClient.PutAsJsonAsync("/api/user/preferences", new
        {
            theme = "dark",
            sortBy = "updatedAt",
            sortOrder = "desc"
        });
        updatePrefsResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // ── 9. Verify preferences persisted ───────────────────────────────────
        var verifyPrefsResp = await loginClient.GetAsync("/api/user/preferences");
        verifyPrefsResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var verifyPrefsBody = await verifyPrefsResp.Content.ReadFromJsonAsync<JsonElement>();
        verifyPrefsBody.GetProperty("theme").GetString().Should().Be("dark");
        verifyPrefsBody.GetProperty("sortBy").GetString().Should().Be("updatedAt");
        verifyPrefsBody.GetProperty("sortOrder").GetString().Should().Be("desc");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Flow 2: Notes favorites lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task NotesFavoritesFlow_CreateToggleFavoriteFilterSortNotes_Succeeds()
    {
        var (client, tabId) = await ClientWithTabAsync();

        // ── 1. Create multiple notes ──────────────────────────────────────────
        var note1Id = await CreateNoteAsync(client, tabId, "Alpha Note");
        var note2Id = await CreateNoteAsync(client, tabId, "Beta Note");
        var note3Id = await CreateNoteAsync(client, tabId, "Gamma Note");

        // ── 2. Toggle note1 as favorite ───────────────────────────────────────
        var toggleResp = await client.PutAsync($"/api/notes/{note1Id}/favorite", null);
        toggleResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var toggleBody = await toggleResp.Content.ReadFromJsonAsync<JsonElement>();
        toggleBody.GetProperty("isFavorite").GetBoolean().Should().BeTrue("first toggle should set favorite");

        // ── 3. Toggle note3 as favorite ───────────────────────────────────────
        var toggle3Resp = await client.PutAsync($"/api/notes/{note3Id}/favorite", null);
        toggle3Resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var toggle3Body = await toggle3Resp.Content.ReadFromJsonAsync<JsonElement>();
        toggle3Body.GetProperty("isFavorite").GetBoolean().Should().BeTrue();

        // ── 4. Filter by favorites only ───────────────────────────────────────
        var favResp = await client.GetAsync("/api/notes?isFavoriteOnly=true");
        favResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var favBody = await favResp.Content.ReadFromJsonAsync<JsonElement>();
        var favItems = favBody.GetProperty("items").EnumerateArray().ToList();
        favItems.Should().HaveCount(2, "only note1 and note3 are favorites");
        favItems.Select(i => i.GetProperty("title").GetString()).Should().Contain("Alpha Note");
        favItems.Select(i => i.GetProperty("title").GetString()).Should().Contain("Gamma Note");
        favItems.Select(i => i.GetProperty("title").GetString()).Should().NotContain("Beta Note");

        // ── 5. Sort notes by title ascending ─────────────────────────────────
        var sortResp = await client.GetAsync("/api/notes?sortBy=2&sortOrder=0"); // Title Asc
        sortResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var sortBody = await sortResp.Content.ReadFromJsonAsync<JsonElement>();
        var sortedItems = sortBody.GetProperty("items").EnumerateArray().ToList();
        sortedItems.Should().HaveCount(3);
        sortedItems[0].GetProperty("title").GetString().Should().Be("Alpha Note");
        sortedItems[1].GetProperty("title").GetString().Should().Be("Beta Note");
        sortedItems[2].GetProperty("title").GetString().Should().Be("Gamma Note");

        // ── 6. Toggle note1 OFF (unfavorite) ──────────────────────────────────
        var unFavResp = await client.PutAsync($"/api/notes/{note1Id}/favorite", null);
        unFavResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var unFavBody = await unFavResp.Content.ReadFromJsonAsync<JsonElement>();
        unFavBody.GetProperty("isFavorite").GetBoolean().Should().BeFalse("second toggle should unset favorite");

        // ── 7. Filter favorites again — only note3 remains ───────────────────
        var favResp2 = await client.GetAsync("/api/notes?isFavoriteOnly=true");
        favResp2.StatusCode.Should().Be(HttpStatusCode.OK);
        var favBody2 = await favResp2.Content.ReadFromJsonAsync<JsonElement>();
        var favItems2 = favBody2.GetProperty("items").EnumerateArray().ToList();
        favItems2.Should().HaveCount(1, "only note3 remains favorited");
        favItems2[0].GetProperty("title").GetString().Should().Be("Gamma Note");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Flow 3: Theme persistence via API
    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ThemePersistenceFlow_SetThemeReloadVerifyThemeRestored_Succeeds()
    {
        var (client, _) = await ClientWithTabAsync();

        // ── 1. Get initial preferences — theme should be System ──────────────
        var initResp = await client.GetAsync("/api/user/preferences");
        initResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var initBody = await initResp.Content.ReadFromJsonAsync<JsonElement>();
        initBody.GetProperty("theme").GetString().Should().Be("system", "default theme is System");

        // ── 2. Set theme to Dark ──────────────────────────────────────────────
        var setResp = await client.PutAsJsonAsync("/api/user/preferences", new
        {
            theme = "dark",
            sortBy = "createdAt",
            sortOrder = "desc"
        });
        setResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var setBody = await setResp.Content.ReadFromJsonAsync<JsonElement>();
        setBody.GetProperty("theme").GetString().Should().Be("dark");

        // ── 3. Simulate "page reload" — fresh GET to verify persistence ───────
        var reloadResp = await client.GetAsync("/api/user/preferences");
        reloadResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var reloadBody = await reloadResp.Content.ReadFromJsonAsync<JsonElement>();
        reloadBody.GetProperty("theme").GetString().Should().Be("dark", "theme must persist across requests (simulated reload)");

        // ── 4. Change to Light, verify again ──────────────────────────────────
        var lightResp = await client.PutAsJsonAsync("/api/user/preferences", new
        {
            theme = "light",
            sortBy = "createdAt",
            sortOrder = "desc"
        });
        lightResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var light2Resp = await client.GetAsync("/api/user/preferences");
        light2Resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var light2Body = await light2Resp.Content.ReadFromJsonAsync<JsonElement>();
        light2Body.GetProperty("theme").GetString().Should().Be("light", "light theme must also persist");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private async Task<(HttpClient Client, Guid TabId)> ClientWithTabAsync()
    {
        var client = _factory.CreateClient();
        var email = $"uxflow_{Guid.NewGuid():N}@example.com";

        var regResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "SecurePass1!",
            displayName = "UX Flow User"
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

    private static async Task<string> CreateNoteAsync(HttpClient client, Guid tabId, string title)
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
