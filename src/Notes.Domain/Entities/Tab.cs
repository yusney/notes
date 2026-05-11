namespace Notes.Domain.Entities;

/// <summary>
/// Tab entity — a named container that groups notes for a user.
/// Name: 1–50 chars. Max tabs per user enforced at Application layer.
/// </summary>
public sealed class Tab
{
    private const int MaxNameLength = 50;

    public Guid Id { get; }
    public Guid UserId { get; }
    public string Name { get; private set; }
    public int Order { get; private set; }

    public Tab(Guid id, Guid userId, string name, int order)
    {
        ValidateName(name);
        Id = id;
        UserId = userId;
        Name = name;
        Order = order;
    }

    public void Rename(string newName)
    {
        ValidateName(newName);
        Name = newName;
    }

    public void Reorder(int newOrder)
    {
        Order = newOrder;
    }

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tab name cannot be empty.", nameof(name));

        if (name.Length > MaxNameLength)
            throw new ArgumentException(
                $"Tab name cannot exceed {MaxNameLength} characters.", nameof(name));
    }
}
