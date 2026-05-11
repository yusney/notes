using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Auth.Commands.ResetPassword;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Features.Auth;

public class ResetPasswordCommandHandlerTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IPasswordResetTokenRepository _tokenRepo = Substitute.For<IPasswordResetTokenRepository>();
    private readonly IPasswordHasher _hasher = Substitute.For<IPasswordHasher>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private ResetPasswordCommandHandler CreateHandler() =>
        new(_userRepo, _tokenRepo, _hasher, _uow);

    private static string HashToken(string plain)
    {
        var bytes = System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(plain));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    [Fact]
    public async Task Handle_ValidToken_UpdatesPasswordAndDeletesToken()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email("alice@example.com"), "Alice", "old_hash");

        // Create a real token entity using factory (so we have matching hash)
        var (tokenEntity, plainToken) = PasswordResetToken.Create(userId);

        _tokenRepo.GetByHashAsync(Arg.Any<string>()).Returns(tokenEntity);
        _userRepo.GetByIdAsync(userId).Returns(user);
        _hasher.Hash("NewP@ss1").Returns("new_hash");

        // Act
        var result = await CreateHandler().Handle(
            new ResetPasswordCommand(plainToken, "NewP@ss1"), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("new_hash", user.PasswordHash);
        await _tokenRepo.Received(1).DeleteAsync(tokenEntity, Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_TokenNotFound_ReturnsFailResult()
    {
        // Triangulation: invalid/unknown token
        _tokenRepo.GetByHashAsync(Arg.Any<string>()).Returns((PasswordResetToken?)null);

        var result = await CreateHandler().Handle(
            new ResetPasswordCommand("invalid_token", "NewP@ss1"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("invalid", result.Errors[0], StringComparison.OrdinalIgnoreCase);
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ExpiredToken_ReturnsFailResult()
    {
        // Triangulation: expired token cannot be used
        var userId = Guid.NewGuid();
        var (tokenEntity, plainToken) = PasswordResetToken.Create(userId);
        // Simulate expired by marking as used first (easier than time travel)
        tokenEntity.MarkAsUsed();

        _tokenRepo.GetByHashAsync(Arg.Any<string>()).Returns(tokenEntity);

        var result = await CreateHandler().Handle(
            new ResetPasswordCommand(plainToken, "NewP@ss1"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("invalid", result.Errors[0], StringComparison.OrdinalIgnoreCase);
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
