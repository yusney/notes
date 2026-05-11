using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Users.Commands.ChangePassword;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Features.Users;

public class ChangePasswordCommandHandlerTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IPasswordHasher _hasher = Substitute.For<IPasswordHasher>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private ChangePasswordCommandHandler CreateHandler() => new(_userRepo, _hasher, _uow);

    [Fact]
    public async Task Handle_CorrectCurrentPassword_ChangesPasswordAndReturnsOk()
    {
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email("carol@example.com"), "Carol", "old-hash");

        _userRepo.GetByIdAsync(userId, Arg.Any<CancellationToken>()).Returns(user);
        _hasher.Verify("CurrentPass1!", "old-hash").Returns(true);
        _hasher.Hash("NewPass1!").Returns("new-hash");

        var result = await CreateHandler().Handle(
            new ChangePasswordCommand(userId, "CurrentPass1!", "NewPass1!"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_IncorrectCurrentPassword_ReturnsFailure()
    {
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email("carol@example.com"), "Carol", "old-hash");

        _userRepo.GetByIdAsync(userId, Arg.Any<CancellationToken>()).Returns(user);
        _hasher.Verify("WrongPass1!", "old-hash").Returns(false);

        var result = await CreateHandler().Handle(
            new ChangePasswordCommand(userId, "WrongPass1!", "NewPass1!"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("incorrect", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Handle_UserNotFound_ReturnsFailure()
    {
        var userId = Guid.NewGuid();
        _userRepo.GetByIdAsync(userId, Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await CreateHandler().Handle(
            new ChangePasswordCommand(userId, "Old1!", "New1!"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }
}
