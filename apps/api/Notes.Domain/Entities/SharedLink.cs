namespace Notes.Domain.Entities;

/// <summary>
/// Aggregate-less entity representing a public read-only share link for a note.
/// Token is a 21-char NanoID (URL-safe, ~128 bits of entropy).
/// </summary>
public sealed class SharedLink
{
    // NanoID alphabet: URL-safe characters
    private const string Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
    private const int TokenLength = 21;

    public Guid Id { get; }
    public Guid NoteId { get; }
    public Guid UserId { get; }
    public string Token { get; }
    public DateTime CreatedAt { get; }
    public DateTime? ExpiresAt { get; }
    public DateTime? RevokedAt { get; private set; }
    public int AccessCount { get; private set; }

    private SharedLink(
        Guid id,
        Guid noteId,
        Guid userId,
        string token,
        DateTime createdAt,
        DateTime? expiresAt)
    {
        Id = id;
        NoteId = noteId;
        UserId = userId;
        Token = token;
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
        AccessCount = 0;
    }

    /// <summary>
    /// Factory method. Generates a NanoID token using a cryptographically random source.
    /// </summary>
    public static SharedLink Create(Guid noteId, Guid userId, DateTime? expiresAt = null)
    {
        if (noteId == Guid.Empty) throw new ArgumentException("NoteId is required.", nameof(noteId));
        if (userId == Guid.Empty) throw new ArgumentException("UserId is required.", nameof(userId));

        var token = GenerateNanoId();
        return new SharedLink(
            id: Guid.NewGuid(),
            noteId: noteId,
            userId: userId,
            token: token,
            createdAt: DateTime.UtcNow,
            expiresAt: expiresAt);
    }

    /// <summary>
    /// EF Core constructor — required for materialisation from the database.
    /// </summary>
#pragma warning disable CS8618
    private SharedLink() { }
#pragma warning restore CS8618

    /// <summary>
    /// Returns true when the link is neither revoked nor expired at the given instant.
    /// </summary>
    public bool IsActive(DateTime at)
        => RevokedAt == null && (ExpiresAt == null || at < ExpiresAt);

    /// <summary>
    /// Marks the link as revoked. Idempotent — does nothing if already revoked.
    /// </summary>
    public void Revoke()
    {
        if (RevokedAt == null)
            RevokedAt = DateTime.UtcNow;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static string GenerateNanoId()
    {
        var buffer = new byte[TokenLength];
        System.Security.Cryptography.RandomNumberGenerator.Fill(buffer);

        var chars = new char[TokenLength];
        for (var i = 0; i < TokenLength; i++)
            chars[i] = Alphabet[buffer[i] % Alphabet.Length];

        return new string(chars);
    }
}
