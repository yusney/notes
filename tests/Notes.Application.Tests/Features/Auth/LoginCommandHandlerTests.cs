using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.Auth.Commands.Login;
using Notes.Application.Features.Auth.Commands.RegisterUser;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Features.Auth;

public class LoginCommandHandlerTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IRefreshTokenRepository _refreshTokenRepo = Substitute.For<IRefreshTokenRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IJwtService _jwt = Substitute.For<IJwtService>();
    private readonly IPasswordHasher _hasher = Substitute.For<IPasswordHasher>();

    private LoginCommandHandler CreateHandler() =>
        new(_userRepo, _refreshTokenRepo, _uow, _jwt, _hasher);

    [Fact]
    public async Task Handle_ValidCredentials_ReturnsTokenPair()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email("alice@example.com"), "Alice", "hashed_password");
        _userRepo.GetByEmailAsync("alice@example.com").Returns(user);
        _hasher.Verify("P@ssword1", "hashed_password").Returns(true);
        _jwt.GenerateTokenPair(userId, "alice@example.com")
            .Returns(new TokenPair("access.token", "refresh-value"));

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new LoginCommand("alice@example.com", "P@ssword1"), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("access.token", result.Value!.AccessToken);
        Assert.NotEmpty(result.Value.RefreshToken);

        // Refresh token entity was persisted
        await _refreshTokenRepo.Received(1).AddAsync(Arg.Any<RefreshToken>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UnknownEmail_ReturnsFailResult()
    {
        _userRepo.GetByEmailAsync("nobody@example.com").Returns((User?)null);

        var result = await CreateHandler().Handle(
            new LoginCommand("nobody@example.com", "P@ssword1"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("invalid", result.Errors[0], StringComparison.OrdinalIgnoreCase);

        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WrongPassword_ReturnsFailResult()
    {
        var user = User.CreateLocal(Guid.NewGuid(), new Email("alice@example.com"), "Alice", "hash");
        _userRepo.GetByEmailAsync("alice@example.com").Returns(user);
        _hasher.Verify("wrong_pass", "hash").Returns(false);

        var result = await CreateHandler().Handle(
            new LoginCommand("alice@example.com", "wrong_pass"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("invalid", result.Errors[0], StringComparison.OrdinalIgnoreCase);

        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
