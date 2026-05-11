using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.Notes.Queries.SearchNotes;

namespace Notes.Application.Features.Notes.Queries.GetNote;

public class GetNoteQueryHandler : IRequestHandler<GetNoteQuery, Result<NoteDetailDto>>
{
    private readonly INoteRepository _noteRepository;

    public GetNoteQueryHandler(INoteRepository noteRepository) => _noteRepository = noteRepository;

    public async Task<Result<NoteDetailDto>> Handle(GetNoteQuery request, CancellationToken cancellationToken)
    {
        var note = await _noteRepository.GetByIdAsync(request.NoteId, cancellationToken);
        if (note is null || note.UserId != request.UserId)
            return Result<NoteDetailDto>.Fail("Note not found.");

        return Result<NoteDetailDto>.Ok(new NoteDetailDto(
            note.Id,
            note.TabId,
            note.Title,
            note.Content,
            note.Language,
            note.CreatedAt,
            note.UpdatedAt,
            note.Tags.Select(t => new TagDto(t.Id, t.Name)).ToList(),
            note.IsFavorite,
            note.FavoritedAt));
    }
}
