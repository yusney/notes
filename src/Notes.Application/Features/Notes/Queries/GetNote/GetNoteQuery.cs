using MediatR;
using Notes.Application.Common.Models;
using Notes.Application.Features.Notes.Queries.SearchNotes;

namespace Notes.Application.Features.Notes.Queries.GetNote;

public record NoteDetailDto(
    Guid Id,
    Guid TabId,
    string Title,
    string Content,
    string Language,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<TagDto> Tags,
    bool IsFavorite = false,
    DateTime? FavoritedAt = null);

public record GetNoteQuery(Guid NoteId, Guid UserId) : IRequest<Result<NoteDetailDto>>;
