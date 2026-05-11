using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Notes.Queries.SearchNotes;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using NSubstitute;

namespace Notes.Application.Tests.Features.Notes;

public class SearchNotesQueryHandlerTests
{
    private readonly INoteRepository _noteRepo = Substitute.For<INoteRepository>();

    private SearchNotesQueryHandler CreateHandler() => new(_noteRepo);

    [Fact]
    public async Task Handle_MatchingNotes_ReturnsPaginatedResults()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var notes = new List<Note>
        {
            new(Guid.NewGuid(), userId, tabId, "Intro to TDD", "TDD content", "en", DateTime.UtcNow),
            new(Guid.NewGuid(), userId, tabId, "Advanced TDD", "More TDD", "en", DateTime.UtcNow),
        };

        _noteRepo.SearchAsync(userId, "TDD", 0, 20, null, null,
            Arg.Any<SortBy>(), Arg.Any<SortOrder>(), Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(notes);
        _noteRepo.CountSearchAsync(userId, "TDD", null, null,
            Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(2);

        var result = await CreateHandler().Handle(
            new SearchNotesQuery(userId, "TDD", 1, 20), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Items.Count);
        Assert.Equal(2, result.Value.TotalCount);
        Assert.Equal(1, result.Value.Page);
        Assert.Equal(20, result.Value.PageSize);
        Assert.Equal("Intro to TDD", result.Value.Items[0].Title);
    }

    [Fact]
    public async Task Handle_NoMatchingNotes_ReturnsEmptyPage()
    {
        var userId = Guid.NewGuid();
        _noteRepo.SearchAsync(userId, "xyz", 0, 20, null, null,
            Arg.Any<SortBy>(), Arg.Any<SortOrder>(), Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(new List<Note>());
        _noteRepo.CountSearchAsync(userId, "xyz", null, null,
            Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(0);

        var result = await CreateHandler().Handle(
            new SearchNotesQuery(userId, "xyz", 1, 20), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Items);
        Assert.Equal(0, result.Value.TotalCount);
    }

    [Fact]
    public async Task Handle_Page2_CalculatesCorrectSkipOffset()
    {
        var userId = Guid.NewGuid();
        _noteRepo.SearchAsync(userId, "note", 20, 20, null, null,
            Arg.Any<SortBy>(), Arg.Any<SortOrder>(), Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(new List<Note>());
        _noteRepo.CountSearchAsync(userId, "note", null, null,
            Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(25);

        await CreateHandler().Handle(
            new SearchNotesQuery(userId, "note", 2, 20), CancellationToken.None);

        // Page 2 with pageSize 20 → skip = (2-1)*20 = 20
        await _noteRepo.Received(1).SearchAsync(userId, "note", 20, 20, null, null,
            Arg.Any<SortBy>(), Arg.Any<SortOrder>(), Arg.Any<bool>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithTabId_PassesTabIdToRepository()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        _noteRepo.SearchAsync(userId, "", 0, 20, tabId, null,
            Arg.Any<SortBy>(), Arg.Any<SortOrder>(), Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(new List<Note>());
        _noteRepo.CountSearchAsync(userId, "", tabId, null,
            Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(0);

        await CreateHandler().Handle(
            new SearchNotesQuery(userId, "", 1, 20, tabId, null), CancellationToken.None);

        await _noteRepo.Received(1).SearchAsync(userId, "", 0, 20, tabId, null,
            Arg.Any<SortBy>(), Arg.Any<SortOrder>(), Arg.Any<bool>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithTagIds_PassesTagIdsToRepository()
    {
        var userId = Guid.NewGuid();
        var tagIds = new List<Guid> { Guid.NewGuid(), Guid.NewGuid() };
        _noteRepo.SearchAsync(userId, "", 0, 20, null, tagIds,
            Arg.Any<SortBy>(), Arg.Any<SortOrder>(), Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(new List<Note>());
        _noteRepo.CountSearchAsync(userId, "", null, tagIds,
            Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(0);

        await CreateHandler().Handle(
            new SearchNotesQuery(userId, "", 1, 20, null, tagIds), CancellationToken.None);

        await _noteRepo.Received(1).SearchAsync(userId, "", 0, 20, null, tagIds,
            Arg.Any<SortBy>(), Arg.Any<SortOrder>(), Arg.Any<bool>(), Arg.Any<CancellationToken>());
    }
}
