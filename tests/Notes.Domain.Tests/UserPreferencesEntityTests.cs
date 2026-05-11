using Notes.Domain.Entities;
using Notes.Domain.Enums;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD tests for UserPreferences entity.
/// Task 1.4: UserPreferences with factory + Update()
/// </summary>
public class UserPreferencesEntityTests
{
    [Fact]
    public void Create_WithDefaults_HasExpectedProperties()
    {
        var userId = Guid.NewGuid();
        var prefs = UserPreferences.Create(userId);

        Assert.Equal(userId, prefs.UserId);
        Assert.Equal(Theme.System, prefs.Theme);
        Assert.Equal(SortBy.CreatedAt, prefs.SortBy);
        Assert.Equal(SortOrder.Desc, prefs.SortOrder);
    }

    [Fact]
    public void Update_ChangesTheme_SortBy_SortOrder()
    {
        var prefs = UserPreferences.Create(Guid.NewGuid());
        prefs.Update(Theme.Dark, SortBy.Title, SortOrder.Asc);

        Assert.Equal(Theme.Dark, prefs.Theme);
        Assert.Equal(SortBy.Title, prefs.SortBy);
        Assert.Equal(SortOrder.Asc, prefs.SortOrder);
    }

    [Fact]
    public void Create_WithEmptyUserId_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => UserPreferences.Create(Guid.Empty));
    }
}
