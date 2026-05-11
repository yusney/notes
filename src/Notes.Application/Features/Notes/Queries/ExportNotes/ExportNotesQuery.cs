using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Queries.ExportNotes;

public record ExportNotesQuery(Guid UserId) : IRequest<Result<List<NoteExportDto>>>;

public record NoteExportDto(
    Guid NoteId,
    string Title,
    string Content,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<string> Tags);
