using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Auth.Queries.ValidateResetToken;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Features.Auth;

public class ValidateResetTokenQueryHandlerTests
{
    private readonly IPasswordResetTokenRepository _tokenRepo = Substitute.For<IPasswordResetTokenRepository>();
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();

    private ValidateResetTokenQueryHandler CreateHandler() =>
        new(_tokenRepo, _userRepo);

    [Fact]
    public async Task Handle_ValidToken_ReturnsUserInfo()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email("alice@example.com"), "Alice", "hash");
        var (tokenEntity, plainToken) = PasswordResetToken.Create(userId);

        _tokenRepo.GetByHashAsync(Arg.Any<string>()).Returns(tokenEntity);
        _userRepo.GetByIdAsync(userId).Returns(user);

        // Act
        var result = await CreateHandler().Handle(
            new ValidateResetTokenQuery(plainToken), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("alice@example.com", result.Value!.Email);
        Assert.Equal(userId, result.Value.UserId);
    }

    [Fact]
    public async Task Handle_InvalidToken_ReturnsFailResult()
    {
        // Triangulation: unknown token returns failure
        _tokenRepo.GetByHashAsync(Arg.Any<string>()).Returns((PasswordResetToken?)null);

        var result = await CreateHandler().Handle(
            new ValidateResetTokenQuery("bogus_token"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("invalid", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }
}
