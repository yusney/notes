using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Auth.Commands.ForgotPassword;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Features.Auth;

public class ForgotPasswordCommandHandlerTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IPasswordResetTokenRepository _tokenRepo = Substitute.For<IPasswordResetTokenRepository>();
    private readonly IEmailService _emailService = Substitute.For<IEmailService>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private ForgotPasswordCommandHandler CreateHandler() =>
        new(_userRepo, _tokenRepo, _emailService, _uow);

    [Fact]
    public async Task Handle_ExistingUser_GeneratesTokenAndSendsEmail()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email("alice@example.com"), "Alice", "hash");
        _userRepo.GetByEmailAsync("alice@example.com").Returns(user);

        // Act
        var result = await CreateHandler().Handle(
            new ForgotPasswordCommand("alice@example.com"), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        await _tokenRepo.Received(1).AddAsync(
            Arg.Is<PasswordResetToken>(t => t.UserId == userId),
            Arg.Any<CancellationToken>());
        await _emailService.Received(1).SendPasswordResetEmailAsync(
            "alice@example.com",
            Arg.Is<string>(link => link.Length > 0),
            Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UnknownEmail_ReturnsSuccessSilently()
    {
        // Triangulation: anti-enumeration — unknown email must NOT leak information
        _userRepo.GetByEmailAsync("nobody@example.com").Returns((User?)null);

        var result = await CreateHandler().Handle(
            new ForgotPasswordCommand("nobody@example.com"), CancellationToken.None);

        Assert.True(result.IsSuccess);

        // No token saved, no email sent
        await _tokenRepo.DidNotReceive().AddAsync(Arg.Any<PasswordResetToken>(), Arg.Any<CancellationToken>());
        await _emailService.DidNotReceive().SendPasswordResetEmailAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
