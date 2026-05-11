using Notes.Domain.Enums;

namespace Notes.Domain.Entities;

/// <summary>
/// Per-user preferences: theme, default sort field and direction.
/// Created lazily on first update. 1:1 with User.
/// </summary>
public sealed class UserPreferences
{
    public Guid Id { get; }
    public Guid UserId { get; }
    public Theme Theme { get; private set; }
    public SortBy SortBy { get; private set; }
    public SortOrder SortOrder { get; private set; }

    // Required by EF Core
    private UserPreferences() { }

    private UserPreferences(Guid id, Guid userId, Theme theme, SortBy sortBy, SortOrder sortOrder)
    {
        Id = id;
        UserId = userId;
        Theme = theme;
        SortBy = sortBy;
        SortOrder = sortOrder;
    }

    /// <summary>
    /// Creates a new UserPreferences for the given user with sensible defaults.
    /// </summary>
    public static UserPreferences Create(Guid userId)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("UserId cannot be empty.", nameof(userId));

        return new UserPreferences(Guid.NewGuid(), userId, Theme.System, SortBy.CreatedAt, SortOrder.Desc);
    }

    /// <summary>
    /// Updates all user preference fields.
    /// </summary>
    public void Update(Theme theme, SortBy sortBy, SortOrder sortOrder)
    {
        Theme = theme;
        SortBy = sortBy;
        SortOrder = sortOrder;
    }
}
