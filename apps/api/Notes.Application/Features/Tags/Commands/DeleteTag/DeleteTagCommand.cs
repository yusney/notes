using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tags.Commands.DeleteTag;

public record DeleteTagCommand(Guid TagId, Guid UserId) : IRequest<Result>;
