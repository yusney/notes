using Notes.Domain.Entities;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD tests for Note.ToggleFavorite() method.
/// Task 1.5: IsFavorite, FavoritedAt, ToggleFavorite()
/// </summary>
public class NoteFavoriteTests
{
    private static Note MakeNote() => new Note(
        Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
        "Title", "Content", "en", DateTime.UtcNow);

    [Fact]
    public void Note_DefaultIsFavorite_IsFalse()
    {
        var note = MakeNote();
        Assert.False(note.IsFavorite);
        Assert.Null(note.FavoritedAt);
    }

    [Fact]
    public void ToggleFavorite_WhenNotFavorite_SetsFavoriteTrue()
    {
        var note = MakeNote();
        note.ToggleFavorite();

        Assert.True(note.IsFavorite);
        Assert.NotNull(note.FavoritedAt);
    }

    [Fact]
    public void ToggleFavorite_WhenAlreadyFavorite_ClearsFavorite()
    {
        var note = MakeNote();
        note.ToggleFavorite(); // now favorite
        note.ToggleFavorite(); // back to not favorite

        Assert.False(note.IsFavorite);
        Assert.Null(note.FavoritedAt);
    }
}
