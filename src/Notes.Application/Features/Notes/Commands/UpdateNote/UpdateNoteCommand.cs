using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Commands.UpdateNote;

public record UpdateNoteCommand(
    Guid NoteId,
    Guid UserId,
    string Title,
    string Content,
    List<string>? TagNames = null) : IRequest<Result>;
