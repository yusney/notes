using MediatR;
using Notes.Application.Common.Models;
using Notes.Application.Features.SharedLinks.Dtos;

namespace Notes.Application.Features.SharedLinks.Commands.CreateSharedLink;

public record CreateSharedLinkCommand(
    Guid NoteId,
    Guid UserId,
    DateTime? ExpiresAt) : IRequest<Result<SharedLinkDto>>;
