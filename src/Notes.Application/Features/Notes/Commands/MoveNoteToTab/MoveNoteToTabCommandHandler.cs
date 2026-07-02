using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Commands.MoveNoteToTab;

/// <summary>
/// Handles moving a note to a different tab owned by the caller.
///
/// Ownership check pattern mirrors CreateNoteCommandHandler.cs:29-31:
/// load both the note and the destination tab; reject (404) when either is null
/// or not owned by the requester. Avoids leaking existence of another user's tab.
///
/// Same-tab moves are an idempotent no-op: short-circuit before ChangeTab,
/// which keeps UpdatedAt untouched (spec requirement).
/// </summary>
public class MoveNoteToTabCommandHandler : IRequestHandler<MoveNoteToTabCommand, Result>
{
    private readonly INoteRepository _noteRepository;
    private readonly ITabRepository _tabRepository;
    private readonly IUnitOfWork _unitOfWork;

    public MoveNoteToTabCommandHandler(
        INoteRepository noteRepository,
        ITabRepository tabRepository,
        IUnitOfWork unitOfWork)
    {
        _noteRepository = noteRepository;
        _tabRepository = tabRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(MoveNoteToTabCommand request, CancellationToken cancellationToken)
    {
        var note = await _noteRepository.GetByIdAsync(request.NoteId, cancellationToken);
        if (note is null || note.UserId != request.UserId)
            return Result.Fail("Note not found.");

        // Same-tab short-circuit — MUST NOT mutate or bump UpdatedAt.
        if (note.TabId == request.TabId)
            return Result.Ok();

        var tab = await _tabRepository.GetByIdAsync(request.TabId, cancellationToken);
        if (tab is null || tab.UserId != request.UserId)
            return Result.Fail("Tab not found.");

        note.ChangeTab(request.TabId);
        await _noteRepository.UpdateAsync(note, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }
}