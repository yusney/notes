using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Tabs.Commands.CreateTab;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Tabs;

public class CreateTabCommandHandlerTests
{
    private readonly ITabRepository _tabRepo = Substitute.For<ITabRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private CreateTabCommandHandler CreateHandler() => new(_tabRepo, _uow);

    [Fact]
    public async Task Handle_ValidCommand_CreatesTabAndReturnsId()
    {
        var userId = Guid.NewGuid();
        _tabRepo.CountByUserIdAsync(userId).Returns(2);

        var result = await CreateHandler().Handle(
            new CreateTabCommand(userId, "Work"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(Guid.Empty, result.Value);

        await _tabRepo.Received(1).AddAsync(
            Arg.Is<Tab>(t => t.Name == "Work" && t.UserId == userId && t.Order == 2),
            Arg.Any<CancellationToken>());

        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UserHas10Tabs_ReturnsFailResult()
    {
        var userId = Guid.NewGuid();
        _tabRepo.CountByUserIdAsync(userId).Returns(10);

        var result = await CreateHandler().Handle(
            new CreateTabCommand(userId, "Overflow"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("10", result.Errors[0]);

        await _tabRepo.DidNotReceive().AddAsync(Arg.Any<Tab>(), Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_FirstTabForUser_HasOrder0()
    {
        var userId = Guid.NewGuid();
        _tabRepo.CountByUserIdAsync(userId).Returns(0);

        var result = await CreateHandler().Handle(
            new CreateTabCommand(userId, "General"), CancellationToken.None);

        Assert.True(result.IsSuccess);

        await _tabRepo.Received(1).AddAsync(
            Arg.Is<Tab>(t => t.Order == 0),
            Arg.Any<CancellationToken>());
    }
}
