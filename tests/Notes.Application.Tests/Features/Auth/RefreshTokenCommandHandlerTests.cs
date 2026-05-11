using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.Auth.Commands.RefreshToken;
using Notes.Application.Features.Auth.Commands.RegisterUser;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Features.Auth;

public class RefreshTokenCommandHandlerTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IRefreshTokenRepository _refreshTokenRepo = Substitute.For<IRefreshTokenRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IJwtService _jwt = Substitute.For<IJwtService>();

    private RefreshTokenCommandHandler CreateHandler() =>
        new(_userRepo, _refreshTokenRepo, _uow, _jwt);

    [Fact]
    public async Task Handle_ValidToken_RevokesOldAndIssuesNew()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email("alice@example.com"), "Alice", "hash");
        var oldToken = new RefreshToken(Guid.NewGuid(), userId, "old-refresh-token", DateTime.UtcNow.AddMinutes(-1));

        _refreshTokenRepo.GetByTokenAsync("old-refresh-token").Returns(oldToken);
        _userRepo.GetByIdAsync(userId).Returns(user);
        _jwt.GenerateTokenPair(userId, "alice@example.com")
            .Returns(new TokenPair("new.access.token", "new-refresh-value"));

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(
            new RefreshTokenCommand("old-refresh-token"), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("new.access.token", result.Value!.AccessToken);
        Assert.Equal("new-refresh-value", result.Value.RefreshToken);

        // Old token was revoked (IsUsed = true) and updated
        Assert.True(oldToken.IsUsed);
        await _refreshTokenRepo.Received(1).UpdateAsync(oldToken, Arg.Any<CancellationToken>());

        // New token was persisted
        await _refreshTokenRepo.Received(1).AddAsync(
            Arg.Is<RefreshToken>(t => t.Token == "new-refresh-value" && t.UserId == userId),
            Arg.Any<CancellationToken>());

        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UnknownToken_ReturnsFailResult()
    {
        _refreshTokenRepo.GetByTokenAsync("unknown").Returns((RefreshToken?)null);

        var result = await CreateHandler().Handle(
            new RefreshTokenCommand("unknown"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("invalid", result.Errors[0], StringComparison.OrdinalIgnoreCase);

        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_AlreadyUsedToken_ReturnsFailResult()
    {
        var userId = Guid.NewGuid();
        var usedToken = new RefreshToken(Guid.NewGuid(), userId, "used-token", DateTime.UtcNow.AddMinutes(-5));
        usedToken.Revoke(); // Mark as used
        _refreshTokenRepo.GetByTokenAsync("used-token").Returns(usedToken);

        var result = await CreateHandler().Handle(
            new RefreshTokenCommand("used-token"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("invalid", result.Errors[0], StringComparison.OrdinalIgnoreCase);

        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ExpiredToken_ReturnsFailResult()
    {
        var userId = Guid.NewGuid();
        // Token issued 8 days ago → expired (7-day lifetime)
        var expiredToken = new RefreshToken(Guid.NewGuid(), userId, "expired-token", DateTime.UtcNow.AddDays(-8));
        _refreshTokenRepo.GetByTokenAsync("expired-token").Returns(expiredToken);

        var result = await CreateHandler().Handle(
            new RefreshTokenCommand("expired-token"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
