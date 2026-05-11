using Notes.Domain.Enums;
using Notes.Domain.ValueObjects;

namespace Notes.Domain.Entities;

/// <summary>
/// User domain entity. Supports Local and OAuth (Google, GitHub) auth.
/// Invariants are enforced via factory methods — direct construction is not allowed.
/// </summary>
public sealed class User
{
    public Guid Id { get; }
    public Email Email { get; private set; }
    public string DisplayName { get; private set; }
    public string? PasswordHash { get; private set; }   // null for OAuth users
    public AuthProvider Provider { get; }
    public string? ProviderId { get; private set; }     // null for Local users
    public DateTime CreatedAt { get; }
    public DateTime? UpdatedAt { get; private set; }

    // Required by EF Core for materialization — do NOT use in application code
    private User() { Email = null!; DisplayName = null!; }

    // Private constructor — callers must use factory methods
    private User(
        Guid id,
        Email email,
        string displayName,
        string? passwordHash,
        AuthProvider provider,
        string? providerId,
        DateTime createdAt)
    {
        Id = id;
        Email = email;
        DisplayName = displayName;
        PasswordHash = passwordHash;
        Provider = provider;
        ProviderId = providerId;
        CreatedAt = createdAt;
    }

    // ── Factory methods ─────────────────────────────────────────────────────

    /// <summary>
    /// Creates a user who authenticates with a local email + password.
    /// </summary>
    public static User CreateLocal(Guid id, Email email, string displayName, string passwordHash)
    {
        ValidateDisplayName(displayName);

        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Local users must have a password hash.", nameof(passwordHash));

        return new User(id, email, displayName, passwordHash, AuthProvider.Local, null, DateTime.UtcNow);
    }

    /// <summary>
    /// Creates a user who authenticates via an OAuth provider (Google or GitHub).
    /// </summary>
    public static User CreateOAuth(
        Guid id,
        Email email,
        string displayName,
        AuthProvider provider,
        string providerId)
    {
        if (provider == AuthProvider.Local)
            throw new ArgumentException("Use CreateLocal() for Local provider.", nameof(provider));

        ValidateDisplayName(displayName);

        if (string.IsNullOrWhiteSpace(providerId))
            throw new ArgumentException("OAuth users must have a provider ID.", nameof(providerId));

        return new User(id, email, displayName, null, provider, providerId, DateTime.UtcNow);
    }

    // ── Mutation ─────────────────────────────────────────────────────────────

    public void UpdateDisplayName(string displayName)
    {
        ValidateDisplayName(displayName);
        DisplayName = displayName;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates the user's password hash. Only valid for Local users.
    /// </summary>
    public void UpdatePassword(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new ArgumentException("Password hash cannot be empty.", nameof(newPasswordHash));

        PasswordHash = newPasswordHash;
        UpdatedAt = DateTime.UtcNow;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static void ValidateDisplayName(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name cannot be empty.", nameof(displayName));
    }
}
