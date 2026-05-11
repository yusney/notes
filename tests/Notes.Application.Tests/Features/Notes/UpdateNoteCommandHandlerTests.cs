using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Notes.Commands.UpdateNote;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Notes;

public class UpdateNoteCommandHandlerTests
{
    private readonly INoteRepository _noteRepo = Substitute.For<INoteRepository>();
    private readonly ITagRepository _tagRepo = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private UpdateNoteCommandHandler CreateHandler() => new(_noteRepo, _tagRepo, _uow);

    [Fact]
    public async Task Handle_ValidOwner_UpdatesNoteAndReturnsSuccess()
    {
        var userId = Guid.NewGuid();
        var noteId = Guid.NewGuid();
        var note = new Note(noteId, userId, Guid.NewGuid(), "Old Title", "Old content", "en", DateTime.UtcNow);
        _noteRepo.GetByIdAsync(noteId).Returns(note);

        var result = await CreateHandler().Handle(
            new UpdateNoteCommand(noteId, userId, "New Title", "New content"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("New Title", note.Title);
        Assert.Equal("New content", note.Content);

        await _noteRepo.Received(1).UpdateAsync(note, Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_NoteNotFound_ReturnsFailResult()
    {
        _noteRepo.GetByIdAsync(Arg.Any<Guid>()).Returns((Note?)null);

        var result = await CreateHandler().Handle(
            new UpdateNoteCommand(Guid.NewGuid(), Guid.NewGuid(), "Title", "Content"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);

        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DifferentOwner_ReturnsFailResult()
    {
        var noteId = Guid.NewGuid();
        var noteOwnerId = Guid.NewGuid();
        var note = new Note(noteId, noteOwnerId, Guid.NewGuid(), "Title", "Content", "en", DateTime.UtcNow);
        _noteRepo.GetByIdAsync(noteId).Returns(note);

        var differentUser = Guid.NewGuid();
        var result = await CreateHandler().Handle(
            new UpdateNoteCommand(noteId, differentUser, "New Title", "New Content"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);

        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
