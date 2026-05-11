using Notes.Domain.Entities;
using Notes.Domain.Enums;
using Notes.Domain.ValueObjects;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD RED: Tests for User entity invariants — production code doesn't exist yet.
/// </summary>
public class UserEntityTests
{
    // ── Factory: Local user ─────────────────────────────────────────────────

    [Fact]
    public void User_CreateLocal_HasCorrectProperties()
    {
        var email = new Email("alice@example.com");
        var user = User.CreateLocal(
            id: Guid.NewGuid(),
            email: email,
            displayName: "Alice",
            passwordHash: "hashed_pw_123");

        Assert.Equal(email, user.Email);
        Assert.Equal("Alice", user.DisplayName);
        Assert.Equal(AuthProvider.Local, user.Provider);
        Assert.Equal("hashed_pw_123", user.PasswordHash);
        Assert.Null(user.ProviderId);
    }

    [Fact]
    public void User_CreateLocal_WithoutPasswordHash_ThrowsArgumentException()
    {
        // Local users MUST have a password hash
        var email = new Email("alice@example.com");
        Assert.Throws<ArgumentException>(() =>
            User.CreateLocal(Guid.NewGuid(), email, "Alice", passwordHash: ""));
    }

    [Fact]
    public void User_CreateLocal_WithNullPasswordHash_ThrowsArgumentException()
    {
        var email = new Email("alice@example.com");
        Assert.Throws<ArgumentException>(() =>
            User.CreateLocal(Guid.NewGuid(), email, "Alice", passwordHash: null!));
    }

    // ── Factory: OAuth user (Google / GitHub) ───────────────────────────────

    [Fact]
    public void User_CreateOAuth_Google_HasCorrectProperties()
    {
        var email = new Email("bob@gmail.com");
        var user = User.CreateOAuth(
            id: Guid.NewGuid(),
            email: email,
            displayName: "Bob",
            provider: AuthProvider.Google,
            providerId: "google-sub-12345");

        Assert.Equal(email, user.Email);
        Assert.Equal(AuthProvider.Google, user.Provider);
        Assert.Equal("google-sub-12345", user.ProviderId);
        Assert.Null(user.PasswordHash);
    }

    [Fact]
    public void User_CreateOAuth_GitHub_HasCorrectProperties()
    {
        // Triangulation: GitHub provider works too
        var email = new Email("carol@users.noreply.github.com");
        var user = User.CreateOAuth(
            id: Guid.NewGuid(),
            email: email,
            displayName: "Carol",
            provider: AuthProvider.GitHub,
            providerId: "gh-99");

        Assert.Equal(AuthProvider.GitHub, user.Provider);
        Assert.Equal("gh-99", user.ProviderId);
    }

    [Fact]
    public void User_CreateOAuth_WithEmptyProviderId_ThrowsArgumentException()
    {
        // OAuth users MUST have a provider ID
        var email = new Email("bob@gmail.com");
        Assert.Throws<ArgumentException>(() =>
            User.CreateOAuth(Guid.NewGuid(), email, "Bob", AuthProvider.Google, providerId: ""));
    }

    [Fact]
    public void User_CreateOAuth_WithLocalProvider_ThrowsArgumentException()
    {
        // Cannot use CreateOAuth factory for Local provider
        var email = new Email("bob@example.com");
        Assert.Throws<ArgumentException>(() =>
            User.CreateOAuth(Guid.NewGuid(), email, "Bob", AuthProvider.Local, providerId: "anything"));
    }

    // ── Timestamps ──────────────────────────────────────────────────────────

    [Fact]
    public void User_CreatedAt_IsSetOnCreation()
    {
        var before = DateTime.UtcNow;
        var user = User.CreateLocal(Guid.NewGuid(), new Email("x@y.com"), "X", "pw");
        var after = DateTime.UtcNow;

        Assert.InRange(user.CreatedAt, before, after);
    }

    [Fact]
    public void User_UpdatedAt_IsNullInitially()
    {
        var user = User.CreateLocal(Guid.NewGuid(), new Email("x@y.com"), "X", "pw");
        Assert.Null(user.UpdatedAt);
    }

    [Fact]
    public void User_UpdateDisplayName_ChangesNameAndSetsUpdatedAt()
    {
        var user = User.CreateLocal(Guid.NewGuid(), new Email("x@y.com"), "Old", "pw");

        user.UpdateDisplayName("New Name");

        Assert.Equal("New Name", user.DisplayName);
        Assert.NotNull(user.UpdatedAt);
    }

    // ── Display name validation ──────────────────────────────────────────────

    [Fact]
    public void User_CreateLocal_WithEmptyDisplayName_ThrowsArgumentException()
    {
        var email = new Email("x@y.com");
        Assert.Throws<ArgumentException>(() =>
            User.CreateLocal(Guid.NewGuid(), email, displayName: "", passwordHash: "pw"));
    }

    // ── UpdatePassword ───────────────────────────────────────────────────────

    [Fact]
    public void User_UpdatePassword_UpdatesPasswordHashAndSetsUpdatedAt()
    {
        var user = User.CreateLocal(Guid.NewGuid(), new Email("x@y.com"), "X", "old_hash");

        user.UpdatePassword("new_hash");

        Assert.Equal("new_hash", user.PasswordHash);
        Assert.NotNull(user.UpdatedAt);
    }

    [Fact]
    public void User_UpdatePassword_WithEmptyHash_ThrowsArgumentException()
    {
        // Triangulation: guard against invalid hash
        var user = User.CreateLocal(Guid.NewGuid(), new Email("x@y.com"), "X", "old_hash");

        Assert.Throws<ArgumentException>(() => user.UpdatePassword(""));
    }
}
