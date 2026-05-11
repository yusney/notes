using Notes.Domain.Entities;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD tests for Tag entity.
/// </summary>
public class TagEntityTests
{
    private static Guid NewId() => Guid.NewGuid();

    // ── RED: these tests reference Tag.Create which doesn't exist yet ─────────

    [Fact]
    public void Tag_Create_ValidName_ReturnsTagWithCorrectProperties()
    {
        var userId = NewId();
        var tag = Tag.Create(userId, "work");

        Assert.Equal(userId, tag.UserId);
        Assert.Equal("work", tag.Name);
        Assert.NotEqual(Guid.Empty, tag.Id);
        Assert.True(tag.CreatedAt <= DateTime.UtcNow);
    }

    [Fact]
    public void Tag_Create_NameTooLong_ThrowsArgumentException()
    {
        var longName = new string('a', 51);
        Assert.Throws<ArgumentException>(() => Tag.Create(NewId(), longName));
    }

    [Fact]
    public void Tag_Create_EmptyName_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => Tag.Create(NewId(), ""));
    }

    [Fact]
    public void Tag_Create_WhitespaceName_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => Tag.Create(NewId(), "   "));
    }

    [Fact]
    public void Tag_Create_NameExactly50Chars_IsValid()
    {
        var name = new string('a', 50);
        var tag = Tag.Create(NewId(), name);
        Assert.Equal(50, tag.Name.Length);
    }

    [Fact]
    public void Tag_Rename_ValidName_UpdatesName()
    {
        var tag = Tag.Create(NewId(), "old");
        tag.Rename("new");
        Assert.Equal("new", tag.Name);
    }

    [Fact]
    public void Tag_Rename_TooLong_ThrowsArgumentException()
    {
        var tag = Tag.Create(NewId(), "valid");
        Assert.Throws<ArgumentException>(() => tag.Rename(new string('a', 51)));
    }
}
