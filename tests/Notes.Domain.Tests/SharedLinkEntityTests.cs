using Notes.Domain.Entities;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD RED: SharedLink entity — validity, revocation, expiry.
/// </summary>
public class SharedLinkEntityTests
{
    private static Guid NewId() => Guid.NewGuid();
    private static DateTime Now() => new DateTime(2026, 5, 8, 12, 0, 0, DateTimeKind.Utc);

    // ── Constructor ──────────────────────────────────────────────────────────

    [Fact]
    public void SharedLink_Create_HasExpectedProperties()
    {
        var noteId = NewId();
        var userId = NewId();

        var link = SharedLink.Create(noteId, userId);

        Assert.Equal(noteId, link.NoteId);
        Assert.Equal(userId, link.UserId);
        Assert.NotNull(link.Token);
        Assert.Equal(21, link.Token.Length);
        Assert.Null(link.ExpiresAt);
        Assert.Null(link.RevokedAt);
        Assert.Equal(0, link.AccessCount);
        Assert.NotEqual(Guid.Empty, link.Id);
    }

    [Fact]
    public void SharedLink_Create_WithExpiresAt_HasExpiration()
    {
        var expiresAt = Now().AddDays(7);
        var link = SharedLink.Create(NewId(), NewId(), expiresAt);

        Assert.Equal(expiresAt, link.ExpiresAt);
    }

    // ── IsActive ─────────────────────────────────────────────────────────────

    [Fact]
    public void SharedLink_IsActive_PermanentNonRevoked_ReturnsTrue()
    {
        var link = SharedLink.Create(NewId(), NewId());

        Assert.True(link.IsActive(Now()));
    }

    [Fact]
    public void SharedLink_IsActive_Revoked_ReturnsFalse()
    {
        var link = SharedLink.Create(NewId(), NewId());
        link.Revoke();

        Assert.False(link.IsActive(Now()));
    }

    [Fact]
    public void SharedLink_IsActive_Expired_ReturnsFalse()
    {
        var expiresAt = Now().AddDays(-1); // already past
        var link = SharedLink.Create(NewId(), NewId(), expiresAt);

        Assert.False(link.IsActive(Now()));
    }

    [Fact]
    public void SharedLink_IsActive_NotYetExpired_ReturnsTrue()
    {
        var expiresAt = Now().AddDays(7); // future
        var link = SharedLink.Create(NewId(), NewId(), expiresAt);

        Assert.True(link.IsActive(Now()));
    }

    // ── Revoke ───────────────────────────────────────────────────────────────

    [Fact]
    public void SharedLink_Revoke_SetsRevokedAt()
    {
        var link = SharedLink.Create(NewId(), NewId());
        link.Revoke();

        Assert.NotNull(link.RevokedAt);
    }

    [Fact]
    public void SharedLink_Revoke_Twice_OnlyFirstRevocationStored()
    {
        var link = SharedLink.Create(NewId(), NewId());
        link.Revoke();
        var firstRevocation = link.RevokedAt;

        link.Revoke(); // second call should be idempotent

        Assert.Equal(firstRevocation, link.RevokedAt);
    }

    // ── Token uniqueness (two creates → different tokens) ───────────────────

    [Fact]
    public void SharedLink_TwoLinks_HaveDifferentTokens()
    {
        var link1 = SharedLink.Create(NewId(), NewId());
        var link2 = SharedLink.Create(NewId(), NewId());

        Assert.NotEqual(link1.Token, link2.Token);
    }
}
