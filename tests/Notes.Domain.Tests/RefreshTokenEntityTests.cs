using Notes.Domain.Entities;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD RED: Tests for RefreshToken entity — production code doesn't exist yet.
/// </summary>
public class RefreshTokenEntityTests
{
    private static Guid NewId() => Guid.NewGuid();

    // ── Creation ─────────────────────────────────────────────────────────────

    [Fact]
    public void RefreshToken_Created_HasCorrectProperties()
    {
        var userId = NewId();
        var issuedAt = new DateTime(2026, 5, 2, 0, 0, 0, DateTimeKind.Utc);
        var token = new RefreshToken(
            id: NewId(),
            userId: userId,
            token: "some-opaque-token-value",
            issuedAt: issuedAt);

        Assert.Equal(userId, token.UserId);
        Assert.Equal("some-opaque-token-value", token.Token);
        Assert.Equal(issuedAt, token.IssuedAt);
    }

    // ── Expiration: 7 days ───────────────────────────────────────────────────

    [Fact]
    public void RefreshToken_ExpiresAt_IsSevenDaysAfterIssuedAt()
    {
        var issuedAt = new DateTime(2026, 5, 2, 0, 0, 0, DateTimeKind.Utc);
        var token = new RefreshToken(NewId(), NewId(), "tok", issuedAt);

        Assert.Equal(issuedAt.AddDays(7), token.ExpiresAt);
    }

    [Fact]
    public void RefreshToken_IsExpired_ReturnsFalse_WhenNotYetExpired()
    {
        // Triangulation: fresh token should not be expired
        var issuedAt = DateTime.UtcNow;
        var token = new RefreshToken(NewId(), NewId(), "tok", issuedAt);

        Assert.False(token.IsExpired(DateTime.UtcNow));
    }

    [Fact]
    public void RefreshToken_IsExpired_ReturnsTrue_AfterSevenDays()
    {
        var issuedAt = new DateTime(2026, 4, 24, 0, 0, 0, DateTimeKind.Utc);
        var token = new RefreshToken(NewId(), NewId(), "tok", issuedAt);

        // Check at day 8
        var checkAt = issuedAt.AddDays(8);
        Assert.True(token.IsExpired(checkAt));
    }

    [Fact]
    public void RefreshToken_IsExpired_ReturnsTrue_ExactlyAtExpiryMoment()
    {
        // Boundary: exactly at expiry should be considered expired
        var issuedAt = new DateTime(2026, 5, 1, 12, 0, 0, DateTimeKind.Utc);
        var token = new RefreshToken(NewId(), NewId(), "tok", issuedAt);

        Assert.True(token.IsExpired(issuedAt.AddDays(7)));
    }

    // ── Single-use rotation ──────────────────────────────────────────────────

    [Fact]
    public void RefreshToken_IsUsed_FalseByDefault()
    {
        var token = new RefreshToken(NewId(), NewId(), "tok", DateTime.UtcNow);
        Assert.False(token.IsUsed);
    }

    [Fact]
    public void RefreshToken_Revoke_SetsIsUsedToTrue()
    {
        var token = new RefreshToken(NewId(), NewId(), "tok", DateTime.UtcNow);
        token.Revoke();
        Assert.True(token.IsUsed);
    }

    [Fact]
    public void RefreshToken_Revoke_CalledTwice_ThrowsInvalidOperationException()
    {
        // A token cannot be revoked twice — single-use semantics
        var token = new RefreshToken(NewId(), NewId(), "tok", DateTime.UtcNow);
        token.Revoke();

        Assert.Throws<InvalidOperationException>(() => token.Revoke());
    }

    [Fact]
    public void RefreshToken_IsValid_ReturnsFalse_WhenUsed()
    {
        var token = new RefreshToken(NewId(), NewId(), "tok", DateTime.UtcNow);
        token.Revoke();

        Assert.False(token.IsValid(DateTime.UtcNow));
    }

    [Fact]
    public void RefreshToken_IsValid_ReturnsFalse_WhenExpired()
    {
        var issuedAt = new DateTime(2026, 4, 24, 0, 0, 0, DateTimeKind.Utc);
        var token = new RefreshToken(NewId(), NewId(), "tok", issuedAt);

        Assert.False(token.IsValid(issuedAt.AddDays(8)));
    }

    [Fact]
    public void RefreshToken_IsValid_ReturnsTrue_WhenActiveAndNotExpired()
    {
        var token = new RefreshToken(NewId(), NewId(), "tok", DateTime.UtcNow);
        Assert.True(token.IsValid(DateTime.UtcNow));
    }

    // ── Token value validation ───────────────────────────────────────────────

    [Fact]
    public void RefreshToken_EmptyToken_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            new RefreshToken(NewId(), NewId(), "", DateTime.UtcNow));
    }
}
