using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Notes.Queries.SearchNotes;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using NSubstitute;

namespace Notes.Application.Tests.Features.Notes;

public class SearchNotesWithSortingTests
{
    private readonly INoteRepository _noteRepo = Substitute.For<INoteRepository>();

    private SearchNotesQueryHandler CreateHandler() => new(_noteRepo);

    [Fact]
    public async Task Handle_WithSortByAndOrder_PassesSortParamsToRepository()
    {
        var userId = Guid.NewGuid();
        _noteRepo.SearchAsync(userId, "", 0, 20, null, null, SortBy.Title, SortOrder.Asc, false, Arg.Any<CancellationToken>())
            .Returns(new List<Note>());
        _noteRepo.CountSearchAsync(userId, "", null, null, false, Arg.Any<CancellationToken>()).Returns(0);

        await CreateHandler().Handle(
            new SearchNotesQuery(userId, "", 1, 20, null, null, SortBy.Title, SortOrder.Asc),
            CancellationToken.None);

        await _noteRepo.Received(1).SearchAsync(userId, "", 0, 20, null, null,
            SortBy.Title, SortOrder.Asc, false, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithIsFavoriteFilter_PassesFavoriteParamToRepository()
    {
        var userId = Guid.NewGuid();
        _noteRepo.SearchAsync(userId, "", 0, 20, null, null, SortBy.CreatedAt, SortOrder.Desc, true, Arg.Any<CancellationToken>())
            .Returns(new List<Note>());
        _noteRepo.CountSearchAsync(userId, "", null, null, true, Arg.Any<CancellationToken>()).Returns(0);

        await CreateHandler().Handle(
            new SearchNotesQuery(userId, "", 1, 20, null, null, SortBy.CreatedAt, SortOrder.Desc, IsFavoriteOnly: true),
            CancellationToken.None);

        await _noteRepo.Received(1).SearchAsync(userId, "", 0, 20, null, null,
            SortBy.CreatedAt, SortOrder.Desc, true, Arg.Any<CancellationToken>());
    }
}
