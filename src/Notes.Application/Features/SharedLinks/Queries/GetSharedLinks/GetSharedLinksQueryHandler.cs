using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.SharedLinks.Dtos;

namespace Notes.Application.Features.SharedLinks.Queries.GetSharedLinks;

public class GetSharedLinksQueryHandler : IRequestHandler<GetSharedLinksQuery, Result<List<SharedLinkDto>>>
{
    private readonly ISharedLinkRepository _repo;

    public GetSharedLinksQueryHandler(ISharedLinkRepository repo) => _repo = repo;

    public async Task<Result<List<SharedLinkDto>>> Handle(
        GetSharedLinksQuery request, CancellationToken cancellationToken)
    {
        var links = await _repo.GetByUserIdAsync(request.UserId, cancellationToken);

        if (request.NoteId.HasValue)
            links = links.Where(l => l.NoteId == request.NoteId.Value).ToList();

        var dtos = links.Select(l => new SharedLinkDto(
            l.Id, l.Token, l.NoteId, l.CreatedAt, l.ExpiresAt,
            l.IsActive(DateTime.UtcNow))).ToList();

        return Result<List<SharedLinkDto>>.Ok(dtos);
    }
}
