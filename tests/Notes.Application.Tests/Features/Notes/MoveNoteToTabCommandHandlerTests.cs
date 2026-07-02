using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Notes.Commands.MoveNoteToTab;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Notes;

/// <summary>
/// TDD RED: Tests for MoveNoteToTabCommandHandler.
///
/// Spec scenarios covered (6 cases):
///   - Valid move (happy path): note + tab both owned by caller → Ok
///   - Note not found → Fail
///   - Note owned by different user → Fail (no mutation)
///   - Tab not found → Fail
///   - Tab owned by different user → Fail
///   - Same-tab move (idempotent): MUST NOT mutate, MUST NOT bump UpdatedAt
///
/// Mirrors CreateNoteCommandHandlerTests.cs:17-70 ownership pattern.
/// </summary>
public class MoveNoteToTabCommandHandlerTests
{
    private readonly INoteRepository _noteRepo = Substitute.For<INoteRepository>();
    private readonly ITabRepository _tabRepo = Substitute.For<ITabRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private MoveNoteToTabCommandHandler CreateHandler() => new(_noteRepo, _tabRepo, _uow);

    private static (Guid userId, Guid noteId, Guid sourceTabId, Guid destTabId) SeedSameUser()
    {
        return (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
    }

    [Fact]
    public async Task Handle_ValidMove_UpdatesTabIdAndCallsSaveChanges()
    {
        var (userId, noteId, sourceTabId, destTabId) = SeedSameUser();
        var note = new Note(noteId, userId, sourceTabId, "Title", "Content", "en", DateTime.UtcNow);
        var tab = new Tab(destTabId, userId, "Target", 0);

        _noteRepo.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns(note);
        _tabRepo.GetByIdAsync(destTabId, Arg.Any<CancellationToken>()).Returns(tab);

        var result = await CreateHandler().Handle(
            new MoveNoteToTabCommand(userId, noteId, destTabId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(destTabId, note.TabId);
        Assert.NotNull(note.UpdatedAt);

        await _noteRepo.Received(1).UpdateAsync(note, Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_NoteNotFound_ReturnsFailureAndNoMutation()
    {
        var (userId, noteId, _, destTabId) = SeedSameUser();
        _noteRepo.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns((Note?)null);
        _tabRepo.GetByIdAsync(destTabId, Arg.Any<CancellationToken>())
            .Returns(new Tab(destTabId, userId, "Target", 0));

        var result = await CreateHandler().Handle(
            new MoveNoteToTabCommand(userId, noteId, destTabId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);

        await _noteRepo.DidNotReceive().UpdateAsync(Arg.Any<Note>(), Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_NoteOwnedByDifferentUser_ReturnsFailure()
    {
        var (userId, noteId, _, destTabId) = SeedSameUser();
        var otherUserId = Guid.NewGuid();
        var stolen = new Note(noteId, otherUserId, Guid.NewGuid(), "Stolen", "X", "en", DateTime.UtcNow);
        _noteRepo.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns(stolen);
        _tabRepo.GetByIdAsync(destTabId, Arg.Any<CancellationToken>())
            .Returns(new Tab(destTabId, userId, "Target", 0));

        var result = await CreateHandler().Handle(
            new MoveNoteToTabCommand(userId, noteId, destTabId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
        Assert.NotEqual(destTabId, stolen.TabId); // unchanged
    }

    [Fact]
    public async Task Handle_TabNotFound_ReturnsFailure()
    {
        var (userId, noteId, sourceTabId, destTabId) = SeedSameUser();
        var note = new Note(noteId, userId, sourceTabId, "Title", "Content", "en", DateTime.UtcNow);
        _noteRepo.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns(note);
        _tabRepo.GetByIdAsync(destTabId, Arg.Any<CancellationToken>()).Returns((Tab?)null);

        var result = await CreateHandler().Handle(
            new MoveNoteToTabCommand(userId, noteId, destTabId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
        Assert.Equal(sourceTabId, note.TabId); // unchanged

        await _noteRepo.DidNotReceive().UpdateAsync(Arg.Any<Note>(), Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_TabOwnedByDifferentUser_ReturnsFailure()
    {
        var (userId, noteId, sourceTabId, destTabId) = SeedSameUser();
        var otherUserId = Guid.NewGuid();
        var note = new Note(noteId, userId, sourceTabId, "Title", "Content", "en", DateTime.UtcNow);
        var foreignTab = new Tab(destTabId, otherUserId, "Foreign", 0);
        _noteRepo.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns(note);
        _tabRepo.GetByIdAsync(destTabId, Arg.Any<CancellationToken>()).Returns(foreignTab);

        var result = await CreateHandler().Handle(
            new MoveNoteToTabCommand(userId, noteId, destTabId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
        Assert.Equal(sourceTabId, note.TabId); // unchanged
    }

    [Fact]
    public async Task Handle_SameTabMove_ReturnsSuccessWithoutMutationOrUpdatedAtBump()
    {
        // Triangulation: same-tab move MUST be idempotent — no ChangeTab call, no UpdatedAt bump.
        var (userId, noteId, sourceTabId, _) = SeedSameUser();
        // Note is already in sourceTabId; we "move" it to sourceTabId (== dest).
        var createdAt = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
        var note = new Note(noteId, userId, sourceTabId, "Title", "Content", "en", createdAt);

        _noteRepo.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns(note);

        var result = await CreateHandler().Handle(
            new MoveNoteToTabCommand(userId, noteId, sourceTabId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(sourceTabId, note.TabId);
        Assert.Null(note.UpdatedAt); // unchanged — no bump on same-tab move

        // Repository MUST NOT be touched for same-tab move
        await _noteRepo.DidNotReceive().UpdateAsync(Arg.Any<Note>(), Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        // Tab lookup MUST also be skipped on same-tab short-circuit
        await _tabRepo.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }
}