using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Commands.DeleteNote;

public record DeleteNoteCommand(Guid NoteId, Guid UserId) : IRequest<Result>;
