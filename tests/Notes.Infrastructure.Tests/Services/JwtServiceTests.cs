using FluentAssertions;
using Notes.Infrastructure.Services;

namespace Notes.Infrastructure.Tests.Services;

public sealed class JwtServiceTests
{
    private const string ValidSecret = "super-secret-key-that-is-at-least-32-chars!";
    private const string Issuer = "notes-api";
    private const string Audience = "notes-client";

    private JwtService CreateSut() => new(ValidSecret, Issuer, Audience);

    // ── Constructor ──────────────────────────────────────────────────────────

    [Fact]
    public void Constructor_WithShortSecret_Throws()
    {
        var act = () => new JwtService("short", Issuer, Audience);
        act.Should().Throw<ArgumentException>()
            .WithMessage("*at least 32 characters*");
    }

    [Fact]
    public void Constructor_WithValidSecret_DoesNotThrow()
    {
        var act = () => new JwtService(ValidSecret, Issuer, Audience);
        act.Should().NotThrow();
    }

    // ── GenerateTokenPair ────────────────────────────────────────────────────

    [Fact]
    public void GenerateTokenPair_ReturnsNonEmptyTokens()
    {
        var sut = CreateSut();
        var userId = Guid.NewGuid();

        var result = sut.GenerateTokenPair(userId, "user@example.com");

        result.AccessToken.Should().NotBeNullOrWhiteSpace();
        result.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void GenerateTokenPair_TwoCalls_ReturnsDifferentTokens()
    {
        var sut = CreateSut();
        var userId = Guid.NewGuid();

        var first = sut.GenerateTokenPair(userId, "user@example.com");
        var second = sut.GenerateTokenPair(userId, "user@example.com");

        first.AccessToken.Should().NotBe(second.AccessToken);
        first.RefreshToken.Should().NotBe(second.RefreshToken);
    }

    [Fact]
    public void GenerateTokenPair_AccessTokenIsJwtFormat()
    {
        var sut = CreateSut();
        var result = sut.GenerateTokenPair(Guid.NewGuid(), "user@example.com");

        // JWT format: header.payload.signature (3 parts separated by '.')
        result.AccessToken.Split('.').Should().HaveCount(3);
    }

    [Fact]
    public void GenerateTokenPair_RefreshTokenIsBase64Encoded()
    {
        var sut = CreateSut();
        var result = sut.GenerateTokenPair(Guid.NewGuid(), "user@example.com");

        var act = () => Convert.FromBase64String(result.RefreshToken);
        act.Should().NotThrow();
        Convert.FromBase64String(result.RefreshToken).Should().HaveCount(64);
    }

    // ── ValidateAccessToken ──────────────────────────────────────────────────

    [Fact]
    public void ValidateAccessToken_WithValidToken_ReturnsUserId()
    {
        var sut = CreateSut();
        var userId = Guid.NewGuid();

        var pair = sut.GenerateTokenPair(userId, "user@example.com");
        var result = sut.ValidateAccessToken(pair.AccessToken);

        result.Should().Be(userId);
    }

    [Fact]
    public void ValidateAccessToken_WithInvalidToken_ReturnsNull()
    {
        var sut = CreateSut();

        var result = sut.ValidateAccessToken("not.a.valid.jwt.token");

        result.Should().BeNull();
    }

    [Fact]
    public void ValidateAccessToken_WithWrongSecret_ReturnsNull()
    {
        var sut = CreateSut();
        var otherSut = new JwtService("different-secret-key-at-least-32-chars!!", Issuer, Audience);

        var pair = sut.GenerateTokenPair(Guid.NewGuid(), "user@example.com");
        var result = otherSut.ValidateAccessToken(pair.AccessToken);

        result.Should().BeNull();
    }

    [Fact]
    public void ValidateAccessToken_WithDifferentAudience_ReturnsNull()
    {
        var sut = CreateSut();
        var differentAudience = new JwtService(ValidSecret, Issuer, "wrong-audience");

        var pair = sut.GenerateTokenPair(Guid.NewGuid(), "user@example.com");
        var result = differentAudience.ValidateAccessToken(pair.AccessToken);

        result.Should().BeNull();
    }

    [Fact]
    public void ValidateAccessToken_DifferentUserIds_ReturnCorrectUserId()
    {
        var sut = CreateSut();
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();

        var pair1 = sut.GenerateTokenPair(userId1, "user1@example.com");
        var pair2 = sut.GenerateTokenPair(userId2, "user2@example.com");

        sut.ValidateAccessToken(pair1.AccessToken).Should().Be(userId1);
        sut.ValidateAccessToken(pair2.AccessToken).Should().Be(userId2);
    }
}
