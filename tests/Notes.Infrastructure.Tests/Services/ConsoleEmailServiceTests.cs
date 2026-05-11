using FluentAssertions;
using Notes.Infrastructure.Services;

namespace Notes.Infrastructure.Tests.Services;

public sealed class ConsoleEmailServiceTests
{
    private ConsoleEmailService CreateSut() => new();

    [Fact]
    public async Task SendWelcomeEmailAsync_CompletesWithoutException()
    {
        var sut = CreateSut();
        var act = () => sut.SendWelcomeEmailAsync("user@example.com", "Alice");
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_CompletesWithoutException()
    {
        var sut = CreateSut();
        var act = () => sut.SendPasswordResetEmailAsync("user@example.com", "https://example.com/reset/token");
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_WithDifferentRecipients_BothComplete()
    {
        var sut = CreateSut();

        await sut.SendWelcomeEmailAsync("alice@example.com", "Alice");
        await sut.SendWelcomeEmailAsync("bob@example.com", "Bob");

        // Both complete without exception — the stub just logs to console
        true.Should().BeTrue("both calls completed successfully");
    }
}
