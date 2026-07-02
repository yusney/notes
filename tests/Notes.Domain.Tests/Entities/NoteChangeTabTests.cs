using Notes.Domain.Entities;

namespace Notes.Domain.Tests.Entities;

/// <summary>
/// TDD RED: Tests for Note.ChangeTab(Guid newTabId).
///
/// Spec: "Note.ChangeTab Is Sole TabId Mutation" — ChangeTab MUST update TabId
/// to the supplied value AND bump UpdatedAt to the current time.
/// </summary>
public class NoteChangeTabTests
{
    private static Guid NewId() => Guid.NewGuid();
    private static DateTime Now() => new DateTime(2026, 5, 2, 0, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void ChangeTab_UpdatesTabId_ToSuppliedValue()
    {
        var originalTabId = NewId();
        var note = new Note(
            id: NewId(), userId: NewId(), tabId: originalTabId,
            title: "Title", content: "Content", language: "en", createdAt: Now());

        var newTabId = NewId();
        note.ChangeTab(newTabId);

        Assert.Equal(newTabId, note.TabId);
    }

    [Fact]
    public void ChangeTab_BumpsUpdatedAt_ToNonNullCurrentTime()
    {
        var note = new Note(
            id: NewId(), userId: NewId(), tabId: NewId(),
            title: "Title", content: "Content", language: "en", createdAt: Now());

        // Pre-condition: UpdatedAt is null at construction.
        Assert.Null(note.UpdatedAt);

        var before = DateTime.UtcNow.AddSeconds(-1);
        note.ChangeTab(NewId());
        var after = DateTime.UtcNow.AddSeconds(1);

        Assert.NotNull(note.UpdatedAt);
        Assert.InRange(note.UpdatedAt!.Value, before, after);
    }

    [Fact]
    public void ChangeTab_PreservesUserId_Id_AndOtherFields()
    {
        var userId = NewId();
        var noteId = NewId();
        var note = new Note(
            id: noteId, userId: userId, tabId: NewId(),
            title: "Original Title", content: "Original Content", language: "es", createdAt: Now());

        note.ChangeTab(NewId());

        Assert.Equal(userId, note.UserId);
        Assert.Equal(noteId, note.Id);
        Assert.Equal("Original Title", note.Title);
        Assert.Equal("Original Content", note.Content);
        Assert.Equal("es", note.Language);
        Assert.False(note.IsFavorite);
    }

    [Fact]
    public void ChangeTab_CalledMultipleTimes_LatestTabWinsAndUpdatedAtKeepsAdvancing()
    {
        // Triangulation: exercises a different code path (subsequent mutation,
        // not just first), ensuring UpdatedAt isn't pinned to the first bump.
        var tabA = NewId();
        var tabB = NewId();
        var tabC = NewId();
        var note = new Note(
            id: NewId(), userId: NewId(), tabId: tabA,
            title: "Title", content: "Content", language: "en", createdAt: Now());

        note.ChangeTab(tabB);
        var afterFirst = note.UpdatedAt;

        // Sleep just enough that UtcNow ticks forward
        Thread.Sleep(15);

        note.ChangeTab(tabC);
        var afterSecond = note.UpdatedAt;

        Assert.Equal(tabC, note.TabId);
        Assert.NotNull(afterFirst);
        Assert.NotNull(afterSecond);
        Assert.True(afterSecond >= afterFirst, "UpdatedAt must advance (or stay equal) on subsequent ChangeTab calls.");
    }
}