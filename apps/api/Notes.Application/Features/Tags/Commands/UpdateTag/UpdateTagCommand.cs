using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tags.Commands.UpdateTag;

public record UpdateTagCommand(Guid TagId, Guid UserId, string NewName) : IRequest<Result>;
