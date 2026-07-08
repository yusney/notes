namespace Notes.Domain.Entities;

/// <summary>
/// Tag entity — a user-owned label used to categorize notes.
/// Name: 1–50 chars. Uniqueness per user is enforced at Application layer.
/// </summary>
public sealed class Tag
{
    private const int MaxNameLength = 50;

    public Guid Id { get; }
    public Guid UserId { get; }
    public string Name { get; private set; }
    public DateTime CreatedAt { get; }

    // Private constructor for EF Core
    private Tag(Guid id, Guid userId, string name, DateTime createdAt)
    {
        Id = id;
        UserId = userId;
        Name = name;
        CreatedAt = createdAt;
    }

    public static Tag Create(Guid userId, string name)
    {
        ValidateName(name);
        return new Tag(Guid.NewGuid(), userId, name, DateTime.UtcNow);
    }

    public void Rename(string newName)
    {
        ValidateName(newName);
        Name = newName;
    }

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tag name cannot be empty.", nameof(name));

        if (name.Length > MaxNameLength)
            throw new ArgumentException(
                $"Tag name cannot exceed {MaxNameLength} characters.", nameof(name));
    }
}
