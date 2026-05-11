using Notes.Domain.Entities;

namespace Notes.Domain.Tests;

public class NoteTagsTests
{
    private static Note MakeNote() => new Note(
        Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
        "Title", "Content", "en", DateTime.UtcNow);

    private static Tag MakeTag(Guid? userId = null) =>
        Tag.Create(userId ?? Guid.NewGuid(), "test");

    // ── RED: These reference Note.Tags / AddTag / ClearTags which don't exist yet ──

    [Fact]
    public void Note_Tags_InitiallyEmpty()
    {
        var note = MakeNote();
        Assert.Empty(note.Tags);
    }

    [Fact]
    public void Note_AddTag_ContainsTagInCollection()
    {
        var note = MakeNote();
        var tag = MakeTag();

        note.AddTag(tag);

        Assert.Contains(note.Tags, t => t.Id == tag.Id);
    }

    [Fact]
    public void Note_AddTag_MultipleTags_AllPresent()
    {
        var note = MakeNote();
        var tag1 = MakeTag();
        var tag2 = MakeTag();

        note.AddTag(tag1);
        note.AddTag(tag2);

        Assert.Equal(2, note.Tags.Count);
    }

    [Fact]
    public void Note_RemoveTag_TagNoLongerInCollection()
    {
        var note = MakeNote();
        var tag = MakeTag();
        note.AddTag(tag);

        note.RemoveTag(tag);

        Assert.DoesNotContain(note.Tags, t => t.Id == tag.Id);
    }

    [Fact]
    public void Note_ClearTags_RemovesAllTags()
    {
        var note = MakeNote();
        note.AddTag(MakeTag());
        note.AddTag(MakeTag());

        note.ClearTags();

        Assert.Empty(note.Tags);
    }
}
