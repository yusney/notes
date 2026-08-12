using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.SharedLinks.Commands.RevokeSharedLink;

public class RevokeSharedLinkCommandHandler : IRequestHandler<RevokeSharedLinkCommand, Result<bool>>
{
    private readonly ISharedLinkRepository _repo;
    private readonly IUnitOfWork _unitOfWork;

    public RevokeSharedLinkCommandHandler(ISharedLinkRepository repo, IUnitOfWork unitOfWork)
    {
        _repo = repo;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<bool>> Handle(
        RevokeSharedLinkCommand request, CancellationToken cancellationToken)
    {
        var link = await _repo.GetByTokenAsync(request.Token, cancellationToken);
        if (link is null || link.UserId != request.UserId)
            return Result<bool>.Fail("Shared link not found.");

        await _repo.RevokeAsync(link.Id, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Ok(true);
    }
}
