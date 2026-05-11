namespace Notes.Domain.Entities;

/// <summary>
/// Core domain entity representing a personal knowledge note.
/// Belongs to a User and a Tab.
/// </summary>
public sealed class Note
{
    private const int MaxTitleLength = 200;
    private const int MaxContentBytes = 100 * 1024; // 100 KB

    public Guid Id { get; }
    public Guid UserId { get; }
    public Guid TabId { get; }
    public string Title { get; private set; }
    public string Content { get; private set; }
    public string Language { get; private set; }
    public DateTime CreatedAt { get; }
    public DateTime? UpdatedAt { get; private set; }
    public bool IsFavorite { get; private set; }
    public DateTime? FavoritedAt { get; private set; }

    private readonly List<Tag> _tags = new();
    public IReadOnlyCollection<Tag> Tags => _tags.AsReadOnly();

    public Note(
        Guid id,
        Guid userId,
        Guid tabId,
        string title,
        string content,
        string language,
        DateTime createdAt)
    {
        ValidateTitle(title);
        ValidateContent(content);
        ValidateLanguage(language);

        Id = id;
        UserId = userId;
        TabId = tabId;
        Title = title;
        Content = content;
        Language = language;
        CreatedAt = createdAt;
    }

    public void Update(string title, string content)
    {
        ValidateTitle(title);
        ValidateContent(content);

        Title = title;
        Content = content;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ToggleFavorite()
    {
        if (IsFavorite)
        {
            IsFavorite = false;
            FavoritedAt = null;
        }
        else
        {
            IsFavorite = true;
            FavoritedAt = DateTime.UtcNow;
        }
    }

    public void AddTag(Tag tag)
    {
        if (!_tags.Any(t => t.Id == tag.Id))
            _tags.Add(tag);
    }

    public void RemoveTag(Tag tag)
    {
        _tags.RemoveAll(t => t.Id == tag.Id);
    }

    public void ClearTags()
    {
        _tags.Clear();
    }

    // ── Validation helpers ───────────────────────────────────────────────────

    private static void ValidateTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title cannot be empty.", nameof(title));

        if (title.Length > MaxTitleLength)
            throw new ArgumentException(
                $"Title cannot exceed {MaxTitleLength} characters.", nameof(title));
    }

    private static void ValidateContent(string content)
    {
        // Content may be empty, but must not exceed 100 KB (char count approximation for ASCII).
        // For multi-byte text a byte-level check would be used at the application layer.
        if (content is not null && content.Length > MaxContentBytes)
            throw new ArgumentException(
                $"Content cannot exceed {MaxContentBytes} characters.", nameof(content));
    }

    private static void ValidateLanguage(string language)
    {
        if (string.IsNullOrWhiteSpace(language))
            throw new ArgumentException("Language cannot be empty.", nameof(language));
    }
}
