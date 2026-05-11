using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tabs.Commands.DeleteTab;

public class DeleteTabCommandHandler : IRequestHandler<DeleteTabCommand, Result>
{
    private readonly ITabRepository _tabRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteTabCommandHandler(ITabRepository tabRepository, IUnitOfWork unitOfWork)
    {
        _tabRepository = tabRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteTabCommand request, CancellationToken cancellationToken)
    {
        var tab = await _tabRepository.GetByIdAsync(request.TabId, cancellationToken);
        if (tab is null || tab.UserId != request.UserId)
            return Result.Fail("Tab not found.");

        await _tabRepository.DeleteAsync(request.TabId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Ok();
    }
}
