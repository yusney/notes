using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Ganss.Xss;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Notes.Application.Common.Models;
using Notes.Application.Features.SharedLinks.Dtos;
using Notes.Application.Features.SharedLinks.Queries.GetSharedNoteByToken;

namespace Notes.Api.Tests.Pages;

/// <summary>
/// Unit and integration tests for the SharedNote PageModel and SharedNoteViewModel.
/// RED phase: written before PageModel exists — these will fail until implementation is done.
/// </summary>
public class SharedNotePageModelTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;

    public SharedNotePageModelTests(NotesApiFactory factory) => _factory = factory;

    // ── SharedNoteViewModel unit tests (pure record — no mocks needed) ─────────

    [Fact]
    public void SharedNoteViewModel_StoresAllProperties()
    {
        // Arrange
        var title = "Test Title";
        var sanitizedContent = "<p>Hello world</p>";
        var createdAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        DateTime? updatedAt = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc);

        // Act — references Notes.Api.Pages.S.SharedNoteViewModel
        var vm = new Notes.Api.Pages.S.SharedNoteViewModel(title, sanitizedContent, createdAt, updatedAt);

        // Assert
        vm.Title.Should().Be(title);
        vm.SanitizedContent.Should().Be(sanitizedContent);
        vm.CreatedAt.Should().Be(createdAt);
        vm.UpdatedAt.Should().Be(updatedAt);
    }

    [Fact]
    public void SharedNoteViewModel_NullUpdatedAt_IsAllowed()
    {
        // Arrange
        var createdAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // Act
        var vm = new Notes.Api.Pages.S.SharedNoteViewModel("Title", "<p>Content</p>", createdAt, null);

        // Assert — triangulation: different code path (nullable UpdatedAt)
        vm.UpdatedAt.Should().BeNull();
        vm.Title.Should().Be("Title");
    }

    // ── HtmlSanitizer unit tests (pure function behavior) ─────────────────────

    [Fact]
    public void HtmlSanitizer_AllowedTags_ArePreserved()
    {
        // Arrange — verify the sanitizer config allows expected tags
        var sanitizer = BuildConfiguredSanitizer();
        var html = "<p>Hello <strong>world</strong></p>";

        // Act
        var result = sanitizer.Sanitize(html);

        // Assert — real production logic runs, specific output asserted
        result.Should().Contain("<p>");
        result.Should().Contain("<strong>");
        result.Should().Contain("world");
    }

    [Fact]
    public void HtmlSanitizer_ScriptTags_AreStripped()
    {
        // Arrange
        var sanitizer = BuildConfiguredSanitizer();
        var maliciousHtml = "<p>Hello</p><script>alert('xss')</script>";

        // Act
        var result = sanitizer.Sanitize(maliciousHtml);

        // Assert — triangulation: different code path (script injection)
        result.Should().NotContain("<script>");
        result.Should().NotContain("alert");
        result.Should().Contain("<p>Hello</p>");
    }

    [Fact]
    public void HtmlSanitizer_OnEventAttributes_AreStripped()
    {
        // Arrange
        var sanitizer = BuildConfiguredSanitizer();
        var maliciousHtml = "<p onclick=\"alert('xss')\">Click me</p>";

        // Act
        var result = sanitizer.Sanitize(maliciousHtml);

        // Assert — triangulation: on* attribute injection
        result.Should().NotContain("onclick");
        result.Should().Contain("Click me");
    }

    [Fact]
    public void HtmlSanitizer_IframeTag_IsStripped()
    {
        // Arrange
        var sanitizer = BuildConfiguredSanitizer();
        var maliciousHtml = "<p>Content</p><iframe src=\"https://evil.com\"></iframe>";

        // Act
        var result = sanitizer.Sanitize(maliciousHtml);

        // Assert — triangulation: iframe injection
        result.Should().NotContain("<iframe>");
        result.Should().Contain("Content");
    }

    // ── Integration: Razor Pages routing + PageModel redirect behavior ────────

    [Fact]
    public async Task SharedNotePage_InvalidToken_RedirectsToNotFound()
    {
        // Arrange
        var client = _factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        // Act — GET /s/nonexistent-token → PageModel finds nothing → redirects to /S/NotFound
        var response = await client.GetAsync("/s/nonexistent-token-xyz");

        // Assert — must be redirect (3xx), not 404 (routing not found) or 500
        ((int)response.StatusCode).Should().BeInRange(301, 308,
            "an invalid token should redirect to the NotFound page, not produce a routing 404");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Replicates the HtmlSanitizer configuration from Program.cs so unit tests
    /// can verify sanitizer behavior without spinning up the full host.
    /// </summary>
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
}
