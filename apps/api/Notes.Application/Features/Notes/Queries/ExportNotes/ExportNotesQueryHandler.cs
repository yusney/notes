using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Queries.ExportNotes;

public class ExportNotesQueryHandler : IRequestHandler<ExportNotesQuery, Result<List<NoteExportDto>>>
{
    private readonly INoteRepository _noteRepository;

    public ExportNotesQueryHandler(INoteRepository noteRepository)
    {
        _noteRepository = noteRepository;
    }

    public async Task<Result<List<NoteExportDto>>> Handle(
        ExportNotesQuery request, CancellationToken cancellationToken)
    {
        var notes = await _noteRepository.GetAllForUserAsync(request.UserId, cancellationToken);

        var dtos = notes.Select(n => new NoteExportDto(
            n.Id,
            n.Title,
            n.Content ?? string.Empty,
            n.CreatedAt,
            n.UpdatedAt,
            n.Tags.Select(t => t.Name).ToList()
        )).ToList();

        return Result<List<NoteExportDto>>.Ok(dtos);
    }
}
