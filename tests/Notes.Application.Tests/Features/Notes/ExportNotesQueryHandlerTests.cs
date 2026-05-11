using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Notes.Queries.ExportNotes;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Notes;

public class ExportNotesQueryHandlerTests
{
    private readonly INoteRepository _noteRepo = Substitute.For<INoteRepository>();

    private ExportNotesQueryHandler CreateHandler() => new(_noteRepo);

    [Fact]
    public async Task Handle_UserWithNotes_ReturnsAllNotesAsDtos()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();

        var note = new Note(Guid.NewGuid(), userId, tabId, "My Note", "Hello world", "en", DateTime.UtcNow);
        var tag = Tag.Create(userId, "work");
        note.AddTag(tag);

        _noteRepo.GetAllForUserAsync(userId, Arg.Any<CancellationToken>())
            .Returns(new List<Note> { note });

        var result = await CreateHandler().Handle(new ExportNotesQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value!);
        Assert.Equal("My Note", result.Value![0].Title);
        Assert.Equal("Hello world", result.Value[0].Content);
        Assert.Contains("work", result.Value[0].Tags);
    }

    [Fact]
    public async Task Handle_UserWithNoNotes_ReturnsEmptyList()
    {
        var userId = Guid.NewGuid();
        _noteRepo.GetAllForUserAsync(userId, Arg.Any<CancellationToken>())
            .Returns(new List<Note>());

        var result = await CreateHandler().Handle(new ExportNotesQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!);
    }

    [Fact]
    public async Task Handle_NotesWithSameTitle_EachDtoHasUniqueId()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();

        var note1 = new Note(id1, userId, tabId, "Duplicate Title", "content 1", "en", DateTime.UtcNow);
        var note2 = new Note(id2, userId, tabId, "Duplicate Title", "content 2", "en", DateTime.UtcNow);

        _noteRepo.GetAllForUserAsync(userId, Arg.Any<CancellationToken>())
            .Returns(new List<Note> { note1, note2 });

        var result = await CreateHandler().Handle(new ExportNotesQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Count);
        Assert.NotEqual(result.Value[0].NoteId, result.Value[1].NoteId);
        Assert.All(result.Value, dto => Assert.Equal("Duplicate Title", dto.Title));
    }
}
