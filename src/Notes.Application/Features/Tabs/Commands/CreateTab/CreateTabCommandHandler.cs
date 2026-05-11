using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Domain.Entities;

namespace Notes.Application.Features.Tabs.Commands.CreateTab;

public class CreateTabCommandHandler : IRequestHandler<CreateTabCommand, Result<Guid>>
{
    private const int MaxTabsPerUser = 10;

    private readonly ITabRepository _tabRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateTabCommandHandler(ITabRepository tabRepository, IUnitOfWork unitOfWork)
    {
        _tabRepository = tabRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateTabCommand request, CancellationToken cancellationToken)
    {
        var count = await _tabRepository.CountByUserIdAsync(request.UserId, cancellationToken);

        if (count >= MaxTabsPerUser)
            return Result<Guid>.Fail($"Maximum of {MaxTabsPerUser} tabs per user has been reached.");

        var tab = new Tab(Guid.NewGuid(), request.UserId, request.Name, count);

        await _tabRepository.AddAsync(tab, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Ok(tab.Id);
    }
}
