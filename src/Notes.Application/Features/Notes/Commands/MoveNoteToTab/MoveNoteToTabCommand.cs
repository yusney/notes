using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Commands.MoveNoteToTab;

/// <summary>
/// Command to move a note from its current tab into a different tab owned by the same user.
/// Returns a non-generic Result (void outcome) — success is 204, failure is 404.
/// </summary>
public record MoveNoteToTabCommand(Guid UserId, Guid NoteId, Guid TabId) : IRequest<Result>;