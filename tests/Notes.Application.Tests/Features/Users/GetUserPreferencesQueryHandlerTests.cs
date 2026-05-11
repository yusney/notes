using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Users.Queries.GetUserPreferences;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using NSubstitute;

namespace Notes.Application.Tests.Features.Users;

public class GetUserPreferencesQueryHandlerTests
{
    private readonly IUserPreferencesRepository _prefsRepo = Substitute.For<IUserPreferencesRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private GetUserPreferencesQueryHandler CreateHandler() => new(_prefsRepo, _uow);

    [Fact]
    public async Task Handle_ExistingPreferences_ReturnsDto()
    {
        var userId = Guid.NewGuid();
        var prefs = UserPreferences.Create(userId);
        prefs.Update(Theme.Dark, SortBy.Title, SortOrder.Asc);

        _prefsRepo.GetByUserIdAsync(userId, Arg.Any<CancellationToken>()).Returns(prefs);

        var result = await CreateHandler().Handle(
            new GetUserPreferencesQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(Theme.Dark, result.Value!.Theme);
        Assert.Equal(SortBy.Title, result.Value.SortBy);
        Assert.Equal(SortOrder.Asc, result.Value.SortOrder);
    }

    [Fact]
    public async Task Handle_NoPreferencesExist_CreatesDefaultsAndReturnsDto()
    {
        var userId = Guid.NewGuid();

        _prefsRepo.GetByUserIdAsync(userId, Arg.Any<CancellationToken>()).Returns((UserPreferences?)null);

        var result = await CreateHandler().Handle(
            new GetUserPreferencesQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(Theme.System, result.Value!.Theme);
        Assert.Equal(SortBy.CreatedAt, result.Value.SortBy);
        Assert.Equal(SortOrder.Desc, result.Value.SortOrder);
        await _prefsRepo.Received(1).AddAsync(Arg.Any<UserPreferences>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
