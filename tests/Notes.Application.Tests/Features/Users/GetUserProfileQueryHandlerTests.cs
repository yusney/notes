using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Users.Queries.GetUserProfile;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Features.Users;

public class GetUserProfileQueryHandlerTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();

    private GetUserProfileQueryHandler CreateHandler() => new(_userRepo);

    [Fact]
    public async Task Handle_ExistingUser_ReturnsProfileDto()
    {
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email("alice@example.com"), "Alice", "hash123");

        _userRepo.GetByIdAsync(userId, Arg.Any<CancellationToken>()).Returns(user);

        var result = await CreateHandler().Handle(
            new GetUserProfileQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Alice", result.Value!.DisplayName);
        Assert.Equal("alice@example.com", result.Value.Email);
        Assert.Equal("Local", result.Value.Provider);
    }

    [Fact]
    public async Task Handle_UserNotFound_ReturnsFailure()
    {
        var userId = Guid.NewGuid();
        _userRepo.GetByIdAsync(userId, Arg.Any<CancellationToken>()).Returns((User?)null);

        var result = await CreateHandler().Handle(
            new GetUserProfileQuery(userId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }
}
