using Notes.Domain.Enums;

namespace Notes.Domain.Tests;

/// <summary>
/// TDD RED: Tests for AuthProvider enum — production code doesn't exist yet.
/// </summary>
public class AuthProviderTests
{
    [Fact]
    public void AuthProvider_HasLocalValue()
    {
        // Arrange / Act
        var provider = AuthProvider.Local;

        // Assert — specific enum value, production code must define it
        Assert.Equal(AuthProvider.Local, provider);
    }

    [Fact]
    public void AuthProvider_HasGoogleValue()
    {
        var provider = AuthProvider.Google;
        Assert.Equal(AuthProvider.Google, provider);
    }

    [Fact]
    public void AuthProvider_HasGitHubValue()
    {
        var provider = AuthProvider.GitHub;
        Assert.Equal(AuthProvider.GitHub, provider);
    }

    [Fact]
    public void AuthProvider_LocalAndGoogle_AreDistinct()
    {
        // Triangulation: different members must have different values
        Assert.NotEqual(AuthProvider.Local, AuthProvider.Google);
        Assert.NotEqual(AuthProvider.Local, AuthProvider.GitHub);
        Assert.NotEqual(AuthProvider.Google, AuthProvider.GitHub);
    }

    [Fact]
    public void AuthProvider_CanBeParsedFromString()
    {
        // Triangulation: must support Enum.Parse for serialization scenarios
        var parsed = Enum.Parse<AuthProvider>("Google");
        Assert.Equal(AuthProvider.Google, parsed);
    }
}
