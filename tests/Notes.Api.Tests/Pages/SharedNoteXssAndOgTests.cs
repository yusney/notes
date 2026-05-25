using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Ganss.Xss;

namespace Notes.Api.Tests.Pages;

/// <summary>
/// Integration tests for XSS sanitization, HTML formatting, Open Graph tags,
/// and complete HtmlSanitizer tag coverage for the shared note web view.
/// RED phase: written against existing production code to verify spec behaviour.
/// </summary>
public class SharedNoteXssAndOgTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public SharedNoteXssAndOgTests(NotesApiFactory factory) => _factory = factory;

    // ── HtmlSanitizer config coverage — all spec-required tags ────────────────

    [Fact]
    public void HtmlSanitizer_AllSpecRequiredTags_ArePreserved()
    {
        // Arrange — build the same sanitizer as Program.cs
        var sanitizer = BuildConfiguredSanitizer();

        // All tags that the spec requires to be preserved
        var html =
            "<p>paragraph</p>" +
            "<h1>h1</h1><h2>h2</h2><h3>h3</h3><h4>h4</h4><h5>h5</h5><h6>h6</h6>" +
            "<strong>strong</strong><em>emphasis</em><b>bold</b><i>italic</i>" +
            "<ul><li>item</li></ul><ol><li>item</li></ol>" +
            "<code>code</code><pre>pre</pre>" +
            "<blockquote>quote</blockquote>" +
            "<a href=\"https://example.com\">link</a>" +
            "<br /><hr />";

        // Act
        var result = sanitizer.Sanitize(html);

        // Assert — every required tag preserved (real output from sanitizer logic)
        result.Should().Contain("<p>", "p tag must be allowed");
        result.Should().Contain("<h1>", "h1 tag must be allowed");
        result.Should().Contain("<h2>", "h2 tag must be allowed");
        result.Should().Contain("<h3>", "h3 tag must be allowed");
        result.Should().Contain("<h4>", "h4 tag must be allowed");
        result.Should().Contain("<h5>", "h5 tag must be allowed");
        result.Should().Contain("<h6>", "h6 tag must be allowed");
        result.Should().Contain("<strong>", "strong tag must be allowed");
        result.Should().Contain("<em>", "em tag must be allowed");
        result.Should().Contain("<b>", "b tag must be allowed");
        result.Should().Contain("<i>", "i tag must be allowed");
        result.Should().Contain("<ul>", "ul tag must be allowed");
        result.Should().Contain("<ol>", "ol tag must be allowed");
        result.Should().Contain("<li>", "li tag must be allowed");
        result.Should().Contain("<code>", "code tag must be allowed");
        result.Should().Contain("<pre>", "pre tag must be allowed");
        result.Should().Contain("<blockquote>", "blockquote tag must be allowed");
        result.Should().Contain("<a ", "a tag must be allowed");
        result.Should().Contain("br", "br element must be allowed");
        result.Should().Contain("hr", "hr element must be allowed");
    }

    [Fact]
    public void HtmlSanitizer_ForbiddenTags_AreStripped()
    {
        // Arrange — triangulation: forbidden tags must be removed
        var sanitizer = BuildConfiguredSanitizer();
        var dangerous =
            "<script>alert('xss')</script>" +
            "<iframe src=\"https://evil.com\"></iframe>" +
            "<object data=\"file.swf\"></object>" +
            "<embed src=\"malware.swf\" />";

        // Act
        var result = sanitizer.Sanitize(dangerous);

        // Assert — none of the forbidden tags survive
        result.Should().NotContain("<script>", "script must be stripped");
        result.Should().NotContain("alert", "script content must be stripped");
        result.Should().NotContain("<iframe>", "iframe must be stripped");
        result.Should().NotContain("<object>", "object must be stripped");
        result.Should().NotContain("<embed>", "embed must be stripped");
    }

    // ── XSS: rendered page must not contain script tag ─────────────────────────

    [Fact]
    public async Task SharedNotePage_NoteWithXssContent_ScriptTagNotInRenderedHtml()
    {
        // Arrange — create a real note with XSS payload via the API
        var (authClient, tabId) = await ClientWithTabAsync();

        var noteResp = await authClient.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "XSS Test Note",
            content = "<p>Safe content</p><script>alert('xss')</script>",
            language = "en"
        });
        noteResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var noteBody = await noteResp.Content.ReadFromJsonAsync<JsonElement>();
        var noteId = noteBody.GetProperty("id").GetString()!;

        var shareResp = await authClient.PostAsJsonAsync($"/api/notes/{noteId}/share", new { });
        shareResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var shareBody = await shareResp.Content.ReadFromJsonAsync<JsonElement>();
        var token = shareBody.GetProperty("token").GetString()!;

        // Act — anonymous GET of the Razor page
        var anonClient = _factory.CreateClient();
        var pageResp = await anonClient.GetAsync($"/s/{token}");
        var html = await pageResp.Content.ReadAsStringAsync();

        // Assert — XSS payload must be absent from rendered output
        pageResp.StatusCode.Should().Be(HttpStatusCode.OK,
            "a valid token should render the note page");
        html.Should().NotContain("alert('xss')",
            "the XSS payload must not appear in any form in the rendered HTML");
        html.Should().NotContain("<script>alert",
            "inline script injection from note content must be stripped by HtmlSanitizer");
        html.Should().Contain("Safe content",
            "allowed content must still be rendered");
    }

    // ── HTML formatting: bold/strong must render as markup, not be escaped ─────

    [Fact]
    public async Task SharedNotePage_NoteWithBoldContent_StrongTagRendered()
    {
        // Arrange — create a note whose content contains <strong>bold</strong>
        var (authClient, tabId) = await ClientWithTabAsync();

        var noteResp = await authClient.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Bold Formatting Note",
            content = "<p>This is <strong>bold text</strong> content.</p>",
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

        // Assert — <strong> must appear as markup, not as escaped &lt;strong&gt;
        pageResp.StatusCode.Should().Be(HttpStatusCode.OK);
        html.Should().Contain("<strong>",
            "strong tag must be preserved and rendered as HTML, not escaped");
        html.Should().Contain("bold text",
            "the text content inside strong must be visible");
        html.Should().NotContain("&lt;strong&gt;",
            "the tag must NOT be HTML-escaped — it must render as real markup");
    }

    // ── Open Graph: og:title meta present for valid token ─────────────────────

    [Fact]
    public async Task SharedNotePage_ValidToken_HasOpenGraphTitleMeta()
    {
        // Arrange — create and share a real note
        var (authClient, tabId) = await ClientWithTabAsync();

        var noteResp = await authClient.PostAsJsonAsync("/api/notes", new
        {
            tabId,
            title = "Open Graph Title Test",
            content = "<p>This note has OG meta tags.</p>",
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

        // Assert — og:title must be in the <head>
        pageResp.StatusCode.Should().Be(HttpStatusCode.OK);
        html.Should().Contain("og:title",
            "the layout must render <meta property=\"og:title\"> for shared notes");
        html.Should().Contain("Open Graph Title Test",
            "the og:title content must contain the note title");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static HtmlSanitizer BuildConfiguredSanitizer()
    {
        var sanitizer = new HtmlSanitizer();
        sanitizer.AllowedTags.Clear();
        foreach (var tag in new[]
        {
            "p", "h1", "h2", "h3", "h4", "h5", "h6",
            "strong", "em", "b", "i", "ul", "ol", "li",
            "code", "pre", "blockquote", "a", "br", "hr",
            "span", "div", "table", "thead", "tbody", "tr", "th", "td", "img"
        })
        {
            sanitizer.AllowedTags.Add(tag);
        }
        return sanitizer;
    }

    private async Task<(HttpClient client, string tabId)> ClientWithTabAsync()
    {
        var client = _factory.CreateClient();
        var email = $"xss-og-{Guid.NewGuid():N}@example.com";

        var registerResp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "P@ssword123!",
            displayName = "XSS OG Test User"
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
