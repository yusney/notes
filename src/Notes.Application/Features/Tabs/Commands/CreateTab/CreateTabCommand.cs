using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tabs.Commands.CreateTab;

public record CreateTabCommand(Guid UserId, string Name) : IRequest<Result<Guid>>;
