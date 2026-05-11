using Notes.Domain.Entities;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD RED: Tests for PasswordResetToken entity.
/// </summary>
public class PasswordResetTokenEntityTests
{
    private static Guid NewId() => Guid.NewGuid();

    // ── Creation / Factory ────────────────────────────────────────────────────

    [Fact]
    public void Create_ReturnsToken_WithCorrectUserId()
    {
        var userId = NewId();
        var (token, _) = PasswordResetToken.Create(userId);

        Assert.Equal(userId, token.UserId);
    }

    [Fact]
    public void Create_ReturnsToken_WithNonEmptyId()
    {
        var (token, _) = PasswordResetToken.Create(NewId());

        Assert.NotEqual(Guid.Empty, token.Id);
    }

    [Fact]
    public void Create_ReturnsToken_WithNonEmptyTokenHash()
    {
        var (token, _) = PasswordResetToken.Create(NewId());

        Assert.False(string.IsNullOrWhiteSpace(token.TokenHash));
    }

    [Fact]
    public void Create_ReturnsPlainToken_ThatIsNotEmpty()
    {
        var (_, plainToken) = PasswordResetToken.Create(NewId());

        Assert.False(string.IsNullOrWhiteSpace(plainToken));
    }

    [Fact]
    public void Create_PlainToken_IsDifferentFromTokenHash()
    {
        var (token, plainToken) = PasswordResetToken.Create(NewId());

        Assert.NotEqual(plainToken, token.TokenHash);
    }

    [Fact]
    public void Create_TwoTokensForSameUser_HaveDifferentHashes()
    {
        var userId = NewId();
        var (t1, _) = PasswordResetToken.Create(userId);
        var (t2, _) = PasswordResetToken.Create(userId);

        Assert.NotEqual(t1.TokenHash, t2.TokenHash);
    }

    // ── Expiry: 1 hour ───────────────────────────────────────────────────────

    [Fact]
    public void Create_ExpiresAt_IsOneHourAfterCreatedAt()
    {
        var (token, _) = PasswordResetToken.Create(NewId());

        // Allow 2-second tolerance for test execution time
        var expectedExpiry = token.CreatedAt.AddHours(1);
        Assert.True(Math.Abs((token.ExpiresAt - expectedExpiry).TotalSeconds) < 2);
    }

    [Fact]
    public void IsExpired_ReturnsFalse_WhenNotYetExpired()
    {
        var (token, _) = PasswordResetToken.Create(NewId());

        Assert.False(token.IsExpired(DateTime.UtcNow));
    }

    [Fact]
    public void IsExpired_ReturnsTrue_AfterOneHour()
    {
        var (token, _) = PasswordResetToken.Create(NewId());

        Assert.True(token.IsExpired(token.CreatedAt.AddHours(1).AddSeconds(1)));
    }

    [Fact]
    public void IsExpired_ReturnsTrue_ExactlyAtExpiryMoment()
    {
        var (token, _) = PasswordResetToken.Create(NewId());

        Assert.True(token.IsExpired(token.ExpiresAt));
    }

    // ── Single-use semantics ─────────────────────────────────────────────────

    [Fact]
    public void IsUsed_FalseByDefault()
    {
        var (token, _) = PasswordResetToken.Create(NewId());

        Assert.False(token.IsUsed);
    }

    [Fact]
    public void MarkAsUsed_SetsIsUsedToTrue()
    {
        var (token, _) = PasswordResetToken.Create(NewId());
        token.MarkAsUsed();

        Assert.True(token.IsUsed);
    }

    [Fact]
    public void MarkAsUsed_CalledTwice_ThrowsInvalidOperationException()
    {
        var (token, _) = PasswordResetToken.Create(NewId());
        token.MarkAsUsed();

        Assert.Throws<InvalidOperationException>(() => token.MarkAsUsed());
    }

    // ── IsValid composite ────────────────────────────────────────────────────

    [Fact]
    public void IsValid_ReturnsTrue_WhenActiveAndNotExpired()
    {
        var (token, _) = PasswordResetToken.Create(NewId());

        Assert.True(token.IsValid(DateTime.UtcNow));
    }

    [Fact]
    public void IsValid_ReturnsFalse_WhenUsed()
    {
        var (token, _) = PasswordResetToken.Create(NewId());
        token.MarkAsUsed();

        Assert.False(token.IsValid(DateTime.UtcNow));
    }

    [Fact]
    public void IsValid_ReturnsFalse_WhenExpired()
    {
        var (token, _) = PasswordResetToken.Create(NewId());

        Assert.False(token.IsValid(token.ExpiresAt.AddSeconds(1)));
    }

    [Fact]
    public void IsValid_ReturnsFalse_WhenBothExpiredAndUsed()
    {
        var (token, _) = PasswordResetToken.Create(NewId());
        token.MarkAsUsed();

        Assert.False(token.IsValid(token.ExpiresAt.AddSeconds(1)));
    }
}
