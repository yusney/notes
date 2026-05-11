using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Notes.Commands.ToggleFavorite;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Notes;

public class ToggleFavoriteCommandHandlerTests
{
    private readonly INoteRepository _noteRepo = Substitute.For<INoteRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private ToggleFavoriteCommandHandler CreateHandler() => new(_noteRepo, _uow);

    [Fact]
    public async Task Handle_ExistingNote_TogglesIsFavoriteAndReturnsDto()
    {
        var userId = Guid.NewGuid();
        var noteId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var note = new Note(noteId, userId, tabId, "Title", "Content", "en", DateTime.UtcNow);
        Assert.False(note.IsFavorite); // starts false

        _noteRepo.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns(note);

        var result = await CreateHandler().Handle(
            new ToggleFavoriteCommand(userId, noteId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.IsFavorite);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_NoteNotFound_ReturnsFailure()
    {
        var userId = Guid.NewGuid();
        var noteId = Guid.NewGuid();

        _noteRepo.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns((Note?)null);

        var result = await CreateHandler().Handle(
            new ToggleFavoriteCommand(userId, noteId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Handle_NoteOwnedByDifferentUser_ReturnsFailure()
    {
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var noteId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var note = new Note(noteId, otherUserId, tabId, "Title", "Content", "en", DateTime.UtcNow);

        _noteRepo.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns(note);

        var result = await CreateHandler().Handle(
            new ToggleFavoriteCommand(userId, noteId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }
}
