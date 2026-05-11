using Notes.Domain.ValueObjects;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD RED: Tests for Email value object — production code doesn't exist yet.
/// </summary>
public class EmailValueObjectTests
{
    // ── Happy path ──────────────────────────────────────────────────────────

    [Fact]
    public void Email_WithValidAddress_CreatesSuccessfully()
    {
        var email = new Email("user@example.com");
        Assert.Equal("user@example.com", email.Value);
    }

    [Fact]
    public void Email_StoredInLowercase()
    {
        // Triangulation: normalise casing for equality
        var email = new Email("User@EXAMPLE.COM");
        Assert.Equal("user@example.com", email.Value);
    }

    // ── Validation guards ────────────────────────────────────────────────────

    [Fact]
    public void Email_EmptyString_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new Email(""));
    }

    [Fact]
    public void Email_WhitespaceOnly_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new Email("   "));
    }

    [Fact]
    public void Email_WithoutAtSign_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new Email("notanemail"));
    }

    [Fact]
    public void Email_WithoutDomain_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new Email("user@"));
    }

    [Fact]
    public void Email_WithoutLocalPart_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new Email("@example.com"));
    }

    // ── Value equality ───────────────────────────────────────────────────────

    [Fact]
    public void Email_SameAddress_AreEqual()
    {
        var a = new Email("user@example.com");
        var b = new Email("user@example.com");
        Assert.Equal(a, b);
    }

    [Fact]
    public void Email_DifferentAddresses_AreNotEqual()
    {
        var a = new Email("alice@example.com");
        var b = new Email("bob@example.com");
        Assert.NotEqual(a, b);
    }

    [Fact]
    public void Email_SameAddressDifferentCase_AreEqual()
    {
        // Triangulation: case-normalised equality
        var a = new Email("User@Example.COM");
        var b = new Email("user@example.com");
        Assert.Equal(a, b);
    }

    [Fact]
    public void Email_GetHashCode_EqualEmailsHaveSameHash()
    {
        var a = new Email("user@example.com");
        var b = new Email("user@example.com");
        Assert.Equal(a.GetHashCode(), b.GetHashCode());
    }
}
