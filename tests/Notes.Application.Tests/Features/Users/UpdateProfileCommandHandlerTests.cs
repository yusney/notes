using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Users.Commands.UpdateProfile;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Features.Users;

public class UpdateProfileCommandHandlerTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private UpdateProfileCommandHandler CreateHandler() => new(_userRepo, _uow);

    [Fact]
    public async Task Handle_ValidDisplayName_UpdatesUserAndReturnsProfile()
    {
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email("bob@example.com"), "Bob", "hash");

        _userRepo.GetByIdAsync(userId, Arg.Any<CancellationToken>()).Returns(user);

        var result = await CreateHandler().Handle(
            new UpdateProfileCommand(userId, "Bobby"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Bobby", result.Value!.DisplayName);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UserNotFound_ReturnsFailure()
    {
        var userId = Guid.NewGuid();
        _userRepo.GetByIdAsync(userId, Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await CreateHandler().Handle(
            new UpdateProfileCommand(userId, "Bob"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }
}
