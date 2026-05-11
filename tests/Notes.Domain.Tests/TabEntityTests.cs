using Notes.Domain.Entities;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD RED: Tests for Tab entity — production code doesn't exist yet.
/// </summary>
public class TabEntityTests
{
    private static Guid NewId() => Guid.NewGuid();

    // ── Happy path ──────────────────────────────────────────────────────────

    [Fact]
    public void Tab_Created_HasCorrectProperties()
    {
        var userId = NewId();
        var tab = new Tab(id: NewId(), userId: userId, name: "Work", order: 0);

        Assert.Equal("Work", tab.Name);
        Assert.Equal(userId, tab.UserId);
        Assert.Equal(0, tab.Order);
    }

    [Fact]
    public void Tab_Order_CanBeNonZero()
    {
        // Triangulation: order is just stored, not validated here
        var tab = new Tab(NewId(), NewId(), "Personal", order: 5);
        Assert.Equal(5, tab.Order);
    }

    // ── Name validation ──────────────────────────────────────────────────────

    [Fact]
    public void Tab_EmptyName_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            new Tab(NewId(), NewId(), name: "", order: 0));
    }

    [Fact]
    public void Tab_WhitespaceName_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            new Tab(NewId(), NewId(), name: "   ", order: 0));
    }

    [Fact]
    public void Tab_NameExactly50Chars_IsValid()
    {
        var name = new string('A', 50);
        var tab = new Tab(NewId(), NewId(), name, order: 0);
        Assert.Equal(50, tab.Name.Length);
    }

    [Fact]
    public void Tab_NameExceeds50Chars_ThrowsArgumentException()
    {
        var longName = new string('A', 51);
        Assert.Throws<ArgumentException>(() =>
            new Tab(NewId(), NewId(), longName, order: 0));
    }

    [Fact]
    public void Tab_NameExactly1Char_IsValid()
    {
        // Triangulation: minimum boundary
        var tab = new Tab(NewId(), NewId(), "X", order: 0);
        Assert.Equal("X", tab.Name);
    }

    // ── Mutation ─────────────────────────────────────────────────────────────

    [Fact]
    public void Tab_Rename_ChangesName()
    {
        var tab = new Tab(NewId(), NewId(), "Old", order: 0);
        tab.Rename("New");
        Assert.Equal("New", tab.Name);
    }

    [Fact]
    public void Tab_Rename_WithEmptyName_ThrowsArgumentException()
    {
        var tab = new Tab(NewId(), NewId(), "Old", order: 0);
        Assert.Throws<ArgumentException>(() => tab.Rename(""));
    }

    [Fact]
    public void Tab_Reorder_ChangesOrder()
    {
        var tab = new Tab(NewId(), NewId(), "Tab", order: 0);
        tab.Reorder(3);
        Assert.Equal(3, tab.Order);
    }
}
