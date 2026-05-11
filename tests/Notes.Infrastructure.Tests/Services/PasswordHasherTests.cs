using FluentAssertions;
using Notes.Infrastructure.Services;

namespace Notes.Infrastructure.Tests.Services;

public sealed class PasswordHasherTests
{
    private PasswordHasher CreateSut() => new();

    // ── Hash ─────────────────────────────────────────────────────────────────

    [Fact]
    public void Hash_ReturnsNonEmptyString()
    {
        var sut = CreateSut();
        var result = sut.Hash("mypassword123");
        result.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Hash_ReturnsBcryptFormat()
    {
        var sut = CreateSut();
        var result = sut.Hash("mypassword123");
        // BCrypt hashes start with $2a$ or $2b$
        result.Should().StartWith("$2");
    }

    [Fact]
    public void Hash_SamePassword_ReturnsDifferentHashes()
    {
        var sut = CreateSut();
        var hash1 = sut.Hash("mypassword123");
        var hash2 = sut.Hash("mypassword123");
        // BCrypt includes a random salt, so same input → different hash
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void Hash_EmptyPassword_Throws()
    {
        var sut = CreateSut();
        var act = () => sut.Hash("");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Hash_WhitespacePassword_Throws()
    {
        var sut = CreateSut();
        var act = () => sut.Hash("   ");
        act.Should().Throw<ArgumentException>();
    }

    // ── Verify ───────────────────────────────────────────────────────────────

    [Fact]
    public void Verify_CorrectPassword_ReturnsTrue()
    {
        var sut = CreateSut();
        var hash = sut.Hash("correct-password");
        sut.Verify("correct-password", hash).Should().BeTrue();
    }

    [Fact]
    public void Verify_WrongPassword_ReturnsFalse()
    {
        var sut = CreateSut();
        var hash = sut.Hash("correct-password");
        sut.Verify("wrong-password", hash).Should().BeFalse();
    }

    [Fact]
    public void Verify_EmptyPassword_ReturnsFalse()
    {
        var sut = CreateSut();
        var hash = sut.Hash("some-password");
        sut.Verify("", hash).Should().BeFalse();
    }

    [Fact]
    public void Verify_EmptyHash_ReturnsFalse()
    {
        var sut = CreateSut();
        sut.Verify("some-password", "").Should().BeFalse();
    }

    [Fact]
    public void Verify_IsCaseSensitive()
    {
        var sut = CreateSut();
        var hash = sut.Hash("Password123");
        sut.Verify("password123", hash).Should().BeFalse();
    }
}
