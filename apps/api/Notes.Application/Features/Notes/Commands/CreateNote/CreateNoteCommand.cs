using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Commands.CreateNote;

public record CreateNoteCommand(
    Guid UserId,
    Guid TabId,
    string Title,
    string Content,
    string Language,
    List<string>? TagNames = null) : IRequest<Result<Guid>>;
