using Notes.Domain.Entities;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD RED: Expanded tests for Note entity.
/// Approval tests for existing behavior + new tests for title length,
/// content size, language, userId, tabId.
/// </summary>
public class NoteEntityTests
{
    private static Guid NewId() => Guid.NewGuid();
    private static DateTime Now() => new DateTime(2026, 5, 2, 0, 0, 0, DateTimeKind.Utc);

    // ── Approval tests (existing behavior — must stay green) ────────────────

    [Fact]
    public void Note_CreatedWithTitleAndContent_HasCorrectProperties()
    {
        var note = new Note(
            id: NewId(), userId: NewId(), tabId: NewId(),
            title: "Test Note", content: "Some content",
            language: "es", createdAt: Now());

        Assert.Equal("Test Note", note.Title);
        Assert.Equal("Some content", note.Content);
    }

    [Fact]
    public void Note_CreatedWithEmptyTitle_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            new Note(NewId(), NewId(), NewId(), "", "Content", "en", Now()));
    }

    [Fact]
    public void Note_Update_ChangesTitle_And_Content()
    {
        var note = new Note(NewId(), NewId(), NewId(), "Original", "Old", "en", Now());
        note.Update("Updated Title", "New content");

        Assert.Equal("Updated Title", note.Title);
        Assert.Equal("New content", note.Content);
        Assert.NotNull(note.UpdatedAt);
    }

    [Fact]
    public void Note_Update_WithWhitespaceTitle_ThrowsArgumentException()
    {
        var note = new Note(NewId(), NewId(), NewId(), "Original", "Content", "en", Now());
        Assert.Throws<ArgumentException>(() => note.Update("   ", "Content"));
    }

    // ── New: UserId and TabId ────────────────────────────────────────────────

    [Fact]
    public void Note_HasUserId_And_TabId()
    {
        var userId = NewId();
        var tabId = NewId();
        var note = new Note(NewId(), userId, tabId, "Title", "Content", "en", Now());

        Assert.Equal(userId, note.UserId);
        Assert.Equal(tabId, note.TabId);
    }

    // ── New: Title max 200 chars ─────────────────────────────────────────────

    [Fact]
    public void Note_TitleExactly200Chars_IsValid()
    {
        var title = new string('A', 200);
        var note = new Note(NewId(), NewId(), NewId(), title, "Content", "en", Now());
        Assert.Equal(200, note.Title.Length);
    }

    [Fact]
    public void Note_TitleExceeds200Chars_ThrowsArgumentException()
    {
        var longTitle = new string('A', 201);
        Assert.Throws<ArgumentException>(() =>
            new Note(NewId(), NewId(), NewId(), longTitle, "Content", "en", Now()));
    }

    // ── New: Content max 100KB ───────────────────────────────────────────────

    [Fact]
    public void Note_ContentExactly100KB_IsValid()
    {
        // 100 * 1024 = 102400 chars (ASCII = 1 byte each)
        var content = new string('x', 100 * 1024);
        var note = new Note(NewId(), NewId(), NewId(), "Title", content, "en", Now());
        Assert.Equal(100 * 1024, note.Content.Length);
    }

    [Fact]
    public void Note_ContentExceeds100KB_ThrowsArgumentException()
    {
        var bigContent = new string('x', 100 * 1024 + 1);
        Assert.Throws<ArgumentException>(() =>
            new Note(NewId(), NewId(), NewId(), "Title", bigContent, "en", Now()));
    }

    // ── New: Language field ──────────────────────────────────────────────────

    [Fact]
    public void Note_Language_IsStoredCorrectly()
    {
        var note = new Note(NewId(), NewId(), NewId(), "Title", "Content", "es", Now());
        Assert.Equal("es", note.Language);
    }

    [Fact]
    public void Note_Language_CanBeDifferentLocale()
    {
        // Triangulation: language is a free-form string (BCP-47), not restricted by domain
        var note = new Note(NewId(), NewId(), NewId(), "Title", "Content", "en-US", Now());
        Assert.Equal("en-US", note.Language);
    }

    [Fact]
    public void Note_Language_EmptyString_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            new Note(NewId(), NewId(), NewId(), "Title", "Content", "", Now()));
    }
}
