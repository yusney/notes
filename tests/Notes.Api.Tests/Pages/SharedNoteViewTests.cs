using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Notes.Api.Tests.Pages;

/// <summary>
/// Integration tests for the shared note view pages — Layout, Index view, NotFound view, and CSS.
/// RED phase: written before the views are fully implemented.
/// Tests verify rendered HTML structure and HTTP behavior.
/// </summary>
public class SharedNoteViewTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public SharedNoteViewTests(NotesApiFactory factory) => _factory = factory;

    // ── Layout tests ──────────────────────────────────────────────────────────

    [Fact]
    public async Task NotFoundPage_RendersWithHtml5Layout()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act — /s/nonexistent-token → redirect → NotFound page
        var response = await client.GetAsync("/S/NotFound");
        var html = await response.Content.ReadAsStringAsync();

        // Assert — HTML5 doctype and charset meta must be present (from _Layout.cshtml)
        response.StatusCode.Should().Be(HttpStatusCode.NotFound,
            "the NotFound page must return HTTP 404");
        html.Should().Contain("utf-8",
            "the layout must include charset meta utf-8");
        html.Should().Contain("<html",
            "the layout must produce a full HTML document");
    }

    [Fact]
    public async Task NotFoundPage_RendersViewportMeta()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/S/NotFound");
        var html = await response.Content.ReadAsStringAsync();

        // Assert — viewport meta for mobile responsiveness
        html.Should().Contain("viewport",
            "the layout must include a viewport meta tag for mobile devices");
    }

    [Fact]
    public async Task NotFoundPage_LinksShareCss()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/S/NotFound");
        var html = await response.Content.ReadAsStringAsync();

        // Assert — stylesheet link to /css/share.css
        html.Should().Contain("share.css",
            "the layout must link to /css/share.css");
    }

    [Fact]
    public async Task NotFoundPage_ContainsFooterBranding()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/S/NotFound");
        var html = await response.Content.ReadAsStringAsync();

        // Assert — footer must say "Created with Notes"
        html.Should().Contain("Created with Notes",
            "the layout footer must contain the branding text");
    }

    // ── NotFound view tests ───────────────────────────────────────────────────

    [Fact]
    public async Task NotFoundPage_Returns404StatusCode()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/S/NotFound");

        // Assert — PageModel sets Response.StatusCode = 404
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task NotFoundPage_RendersUnavailableMessage()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/S/NotFound");
        var html = await response.Content.ReadAsStringAsync();

        // Assert — primary message from spec
        html.Should().Contain("no longer available",
            "the NotFound view must render the unavailability message");
    }

    [Fact]
    public async Task NotFoundPage_RendersExpirySubtitle()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act — triangulation: different assertion target (subtitle vs primary message)
        var response = await client.GetAsync("/S/NotFound");
        var html = await response.Content.ReadAsStringAsync();

        // Assert — subtitle about expiry/revocation
        html.Should().Contain("expired",
            "the NotFound view must include a subtitle about link expiry");
    }

    // ── Index view tests ──────────────────────────────────────────────────────

    [Fact]
    public async Task SharedNotePage_InvalidToken_RendersNotFoundAfterRedirect()
    {
        // Arrange — follow redirects (default client)
        var client = _factory.CreateClient();

        // Act — invalid token triggers redirect to /S/NotFound, which renders 404
        var response = await client.GetAsync("/s/definitely-invalid-token-xyz");

        // Assert — after following redirect, should be on NotFound page (404)
        response.StatusCode.Should().Be(HttpStatusCode.NotFound,
            "following the redirect from an invalid token should reach the NotFound page");
        var html = await response.Content.ReadAsStringAsync();
        html.Should().Contain("no longer available");
    }

    // ── CSS static file tests ─────────────────────────────────────────────────

    [Fact]
    public async Task ShareCss_IsServedAsStaticFile()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act — request the CSS file directly
        var response = await client.GetAsync("/css/share.css");

        // Assert — UseStaticFiles() must serve it
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "share.css must be served as a static file via UseStaticFiles()");
        response.Content.Headers.ContentType?.MediaType.Should().Contain("css",
            "the content type must be text/css");
    }

    [Fact]
    public async Task ShareCss_ContainsCssReset()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/css/share.css");
        var css = await response.Content.ReadAsStringAsync();

        // Assert — box-sizing CSS reset
        css.Should().Contain("box-sizing",
            "share.css must include a CSS reset with box-sizing");
    }

    [Fact]
    public async Task ShareCss_ContainsDarkModeMediaQuery()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act — triangulation: different assertion target
        var response = await client.GetAsync("/css/share.css");
        var css = await response.Content.ReadAsStringAsync();

        // Assert — dark mode media query
        css.Should().Contain("prefers-color-scheme: dark",
            "share.css must include a dark mode media query");
    }
}
