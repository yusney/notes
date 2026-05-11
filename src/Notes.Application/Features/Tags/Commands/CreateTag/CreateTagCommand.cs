using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tags.Commands.CreateTag;

public record CreateTagCommand(Guid UserId, string Name) : IRequest<Result<Guid>>;
