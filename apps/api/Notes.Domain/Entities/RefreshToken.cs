namespace Notes.Domain.Entities;

/// <summary>
/// Refresh token entity — single-use, 7-day expiry, belongs to a User.
/// Rotation pattern: each use must call Revoke() and issue a new token.
/// </summary>
public sealed class RefreshToken
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(7);

    public Guid Id { get; }
    public Guid UserId { get; }
    public string Token { get; }
    public DateTime IssuedAt { get; }
    public DateTime ExpiresAt { get; }
    public bool IsUsed { get; private set; }

    public RefreshToken(Guid id, Guid userId, string token, DateTime issuedAt)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new ArgumentException("Token value cannot be empty.", nameof(token));

        Id = id;
        UserId = userId;
        Token = token;
        IssuedAt = issuedAt;
        ExpiresAt = issuedAt.Add(Lifetime);
        IsUsed = false;
    }

    /// <summary>
    /// Returns true if the token is active (not used) and not expired at the given instant.
    /// </summary>
    public bool IsValid(DateTime at) => !IsUsed && !IsExpired(at);

    /// <summary>
    /// Returns true when the token's expiry moment has been reached or passed.
    /// </summary>
    public bool IsExpired(DateTime at) => at >= ExpiresAt;

    /// <summary>
    /// Marks the token as consumed. Calling this more than once throws.
    /// </summary>
    public void Revoke()
    {
        if (IsUsed)
            throw new InvalidOperationException("Refresh token has already been used.");

        IsUsed = true;
    }
}
