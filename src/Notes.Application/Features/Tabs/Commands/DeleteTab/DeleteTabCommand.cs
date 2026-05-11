using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tabs.Commands.DeleteTab;

public record DeleteTabCommand(Guid TabId, Guid UserId) : IRequest<Result>;
