using System.Security.Cryptography;

namespace Notes.Domain.Entities;

/// <summary>
/// Password reset token — SHA256-hashed, 1-hour expiry, single-use.
/// Only the hash is persisted; the plain token is returned once on creation.
/// </summary>
public sealed class PasswordResetToken
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromHours(1);

    public Guid Id { get; }
    public Guid UserId { get; }
    public string TokenHash { get; }
    public DateTime CreatedAt { get; }
    public DateTime ExpiresAt { get; }
    public bool IsUsed { get; private set; }

    // Required by EF Core for materialization — do NOT use in application code
    private PasswordResetToken() { TokenHash = null!; }

    private PasswordResetToken(Guid id, Guid userId, string tokenHash, DateTime createdAt)
    {
        Id = id;
        UserId = userId;
        TokenHash = tokenHash;
        CreatedAt = createdAt;
        ExpiresAt = createdAt.Add(Lifetime);
        IsUsed = false;
    }

    // ── Factory method ───────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new password reset token.
    /// Returns the entity (with hash stored) and the plain token (shown once).
    /// </summary>
    public static (PasswordResetToken Token, string PlainToken) Create(Guid userId)
    {
        var randomBytes = RandomNumberGenerator.GetBytes(32);
        var plainToken = Convert.ToBase64String(randomBytes)
            .Replace('+', '-').Replace('/', '_').TrimEnd('='); // URL-safe Base64

        var hashBytes = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(plainToken));
        var tokenHash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        var entity = new PasswordResetToken(
            id: Guid.NewGuid(),
            userId: userId,
            tokenHash: tokenHash,
            createdAt: DateTime.UtcNow);

        return (entity, plainToken);
    }

    // ── Validation ───────────────────────────────────────────────────────────

    /// <summary>
    /// Returns true if the token is not used and not expired at the given instant.
    /// </summary>
    public bool IsValid(DateTime at) => !IsUsed && !IsExpired(at);

    /// <summary>
    /// Returns true when the token's expiry moment has been reached or passed.
    /// </summary>
    public bool IsExpired(DateTime at) => at >= ExpiresAt;

    // ── Mutation ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Marks the token as consumed. Calling this more than once throws.
    /// </summary>
    public void MarkAsUsed()
    {
        if (IsUsed)
            throw new InvalidOperationException("Password reset token has already been used.");

        IsUsed = true;
    }
}
