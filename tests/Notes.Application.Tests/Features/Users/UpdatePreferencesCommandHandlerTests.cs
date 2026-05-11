using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Users.Commands.UpdatePreferences;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using NSubstitute;

namespace Notes.Application.Tests.Features.Users;

public class UpdatePreferencesCommandHandlerTests
{
    private readonly IUserPreferencesRepository _prefsRepo = Substitute.For<IUserPreferencesRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private UpdatePreferencesCommandHandler CreateHandler() => new(_prefsRepo, _uow);

    [Fact]
    public async Task Handle_ExistingPreferences_UpdatesAndReturnsDto()
    {
        var userId = Guid.NewGuid();
        var prefs = UserPreferences.Create(userId);

        _prefsRepo.GetByUserIdAsync(userId, Arg.Any<CancellationToken>()).Returns(prefs);

        var result = await CreateHandler().Handle(
            new UpdatePreferencesCommand(userId, Theme.Light, SortBy.UpdatedAt, SortOrder.Asc),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(Theme.Light, result.Value!.Theme);
        Assert.Equal(SortBy.UpdatedAt, result.Value.SortBy);
        Assert.Equal(SortOrder.Asc, result.Value.SortOrder);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_NoPreferencesExist_CreatesAndReturnsDto()
    {
        var userId = Guid.NewGuid();

        _prefsRepo.GetByUserIdAsync(userId, Arg.Any<CancellationToken>()).Returns((UserPreferences?)null);

        var result = await CreateHandler().Handle(
            new UpdatePreferencesCommand(userId, Theme.Dark, SortBy.Title, SortOrder.Asc),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(Theme.Dark, result.Value!.Theme);
        await _prefsRepo.Received(1).AddAsync(Arg.Any<UserPreferences>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
