using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tabs.Queries.GetTabs;

public class GetTabsQueryHandler : IRequestHandler<GetTabsQuery, Result<List<TabDto>>>
{
    private readonly ITabRepository _tabRepository;

    public GetTabsQueryHandler(ITabRepository tabRepository) => _tabRepository = tabRepository;

    public async Task<Result<List<TabDto>>> Handle(GetTabsQuery request, CancellationToken cancellationToken)
    {
        var tabs = await _tabRepository.GetByUserIdAsync(request.UserId, cancellationToken);
        var dtos = tabs.Select(t => new TabDto(t.Id, t.Name, t.Order)).ToList();
        return Result<List<TabDto>>.Ok(dtos);
    }
}
