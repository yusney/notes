using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.SharedLinks.Dtos;

namespace Notes.Application.Features.SharedLinks.Queries.GetSharedNoteByToken;

public class GetSharedNoteByTokenQueryHandler : IRequestHandler<GetSharedNoteByTokenQuery, Result<SharedNoteDto>>
{
    private readonly ISharedLinkRepository _sharedLinkRepo;
    private readonly INoteRepository _noteRepo;

    public GetSharedNoteByTokenQueryHandler(
        ISharedLinkRepository sharedLinkRepo,
        INoteRepository noteRepo)
    {
        _sharedLinkRepo = sharedLinkRepo;
        _noteRepo = noteRepo;
    }

    public async Task<Result<SharedNoteDto>> Handle(
        GetSharedNoteByTokenQuery request, CancellationToken cancellationToken)
    {
        var link = await _sharedLinkRepo.GetByTokenAsync(request.Token, cancellationToken);
        if (link is null || !link.IsActive(DateTime.UtcNow))
            return Result<SharedNoteDto>.Fail("Shared link not found or is no longer valid.");

        var note = await _noteRepo.GetByIdAsync(link.NoteId, cancellationToken);
        if (note is null)
            return Result<SharedNoteDto>.Fail("Note not found.");

        return Result<SharedNoteDto>.Ok(new SharedNoteDto(
            note.Title,
            note.Content,
            note.Language,
            note.CreatedAt,
            note.UpdatedAt));
    }
}
