using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.SharedLinks.Commands.RevokeSharedLink;

public record RevokeSharedLinkCommand(
    string Token,
    Guid UserId) : IRequest<Result<bool>>;
