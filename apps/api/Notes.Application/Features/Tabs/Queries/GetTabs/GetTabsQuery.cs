using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tabs.Queries.GetTabs;

public record TabDto(Guid Id, string Name, int Order);

public record GetTabsQuery(Guid UserId) : IRequest<Result<List<TabDto>>>;
