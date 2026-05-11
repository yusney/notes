using Notes.Domain.Enums;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD tests for Theme, SortBy, SortOrder enums.
/// </summary>
public class UserPreferencesEnumsTests
{
    [Fact]
    public void Theme_HasExpectedValues()
    {
        Assert.Equal(0, (int)Theme.System);
        Assert.Equal(1, (int)Theme.Light);
        Assert.Equal(2, (int)Theme.Dark);
    }

    [Fact]
    public void SortBy_HasExpectedValues()
    {
        Assert.Equal(0, (int)SortBy.CreatedAt);
        Assert.Equal(1, (int)SortBy.UpdatedAt);
        Assert.Equal(2, (int)SortBy.Title);
    }

    [Fact]
    public void SortOrder_HasExpectedValues()
    {
        Assert.Equal(0, (int)SortOrder.Asc);
        Assert.Equal(1, (int)SortOrder.Desc);
    }
}
