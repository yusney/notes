using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Common;

/// <summary>
/// Structural / contract tests for repository interfaces and service interfaces.
/// Validates that each interface exposes the expected members with correct signatures.
/// </summary>
public class InterfaceContractTests
{
    // ── IUserRepository ───────────────────────────────────────────────────────

    [Fact]
    public async Task IUserRepository_GetByEmailAsync_ReturnsNullWhenNotFound()
    {
        var repo = Substitute.For<IUserRepository>();
        repo.GetByEmailAsync("nope@test.com").Returns((User?)null);

        var result = await repo.GetByEmailAsync("nope@test.com");

        Assert.Null(result);
    }

    [Fact]
    public async Task IUserRepository_GetByIdAsync_ReturnsUserWhenExists()
    {
        var repo = Substitute.For<IUserRepository>();
        var id = Guid.NewGuid();
        var user = User.CreateLocal(id, new Email("test@example.com"), "TestUser", "hash123");
        repo.GetByIdAsync(id).Returns(user);

        var result = await repo.GetByIdAsync(id);

        Assert.NotNull(result);
        Assert.Equal(id, result!.Id);
    }

    // ── ITabRepository ────────────────────────────────────────────────────────

    [Fact]
    public async Task ITabRepository_CountByUserIdAsync_ReturnsCorrectCount()
    {
        var repo = Substitute.For<ITabRepository>();
        var userId = Guid.NewGuid();
        repo.CountByUserIdAsync(userId).Returns(3);

        var count = await repo.CountByUserIdAsync(userId);

        Assert.Equal(3, count);
    }

    [Fact]
    public async Task ITabRepository_GetByUserIdAsync_ReturnsTabList()
    {
        var repo = Substitute.For<ITabRepository>();
        var userId = Guid.NewGuid();
        var tabs = new List<Tab>
        {
            new(Guid.NewGuid(), userId, "General", 0),
            new(Guid.NewGuid(), userId, "Work", 1),
        };
        repo.GetByUserIdAsync(userId).Returns(tabs);

        var result = await repo.GetByUserIdAsync(userId);

        Assert.Equal(2, result.Count);
        Assert.Equal("General", result[0].Name);
    }

    // ── INoteRepository ───────────────────────────────────────────────────────

    [Fact]
    public async Task INoteRepository_SearchAsync_ReturnsPaginatedNotes()
    {
        var repo = Substitute.For<INoteRepository>();
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var notes = new List<Note>
        {
            new(Guid.NewGuid(), userId, tabId, "Hello World", "content", "en", DateTime.UtcNow),
        };
        repo.SearchAsync(userId, "Hello", 0, 20).Returns(notes);

        var result = await repo.SearchAsync(userId, "Hello", 0, 20);

        Assert.Single(result);
        Assert.Equal("Hello World", result[0].Title);
    }

    // ── IUnitOfWork ───────────────────────────────────────────────────────────

    [Fact]
    public async Task IUnitOfWork_SaveChangesAsync_ReturnsAffectedRows()
    {
        var uow = Substitute.For<IUnitOfWork>();
        uow.SaveChangesAsync().Returns(2);

        var rows = await uow.SaveChangesAsync();

        Assert.Equal(2, rows);
    }

    // ── IJwtService ───────────────────────────────────────────────────────────

    [Fact]
    public void IJwtService_GenerateTokenPair_ReturnsBothTokens()
    {
        var jwt = Substitute.For<IJwtService>();
        var userId = Guid.NewGuid();
        jwt.GenerateTokenPair(userId, "u@test.com")
           .Returns(new TokenPair("access.token.here", "refresh-token-value"));

        var pair = jwt.GenerateTokenPair(userId, "u@test.com");

        Assert.NotEmpty(pair.AccessToken);
        Assert.NotEmpty(pair.RefreshToken);
    }

    [Fact]
    public void IJwtService_ValidateAccessToken_ReturnsNullForInvalidToken()
    {
        var jwt = Substitute.For<IJwtService>();
        jwt.ValidateAccessToken("bad-token").Returns((Guid?)null);

        var result = jwt.ValidateAccessToken("bad-token");

        Assert.Null(result);
    }

    // ── IEmailService ─────────────────────────────────────────────────────────

    [Fact]
    public async Task IEmailService_SendWelcomeEmailAsync_DoesNotThrow()
    {
        var emailSvc = Substitute.For<IEmailService>();
        // No throws = interface contract is correct
        await emailSvc.SendWelcomeEmailAsync("user@test.com", "Alice");
        await emailSvc.Received(1).SendWelcomeEmailAsync("user@test.com", "Alice");
    }

    // ── Result<T> model ───────────────────────────────────────────────────────

    [Fact]
    public void Result_Ok_HasIsSuccessTrueAndCorrectValue()
    {
        var result = Result<string>.Ok("hello");

        Assert.True(result.IsSuccess);
        Assert.Equal("hello", result.Value);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public void Result_Fail_HasIsSuccessFalseAndErrors()
    {
        var result = Result<string>.Fail("email already taken", "another error");

        Assert.False(result.IsSuccess);
        Assert.Null(result.Value);
        Assert.Equal(2, result.Errors.Length);
        Assert.Contains("email already taken", result.Errors);
    }
}
