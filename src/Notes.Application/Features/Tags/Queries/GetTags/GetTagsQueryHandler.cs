using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tags.Queries.GetTags;

public class GetTagsQueryHandler : IRequestHandler<GetTagsQuery, Result<List<TagDto>>>
{
    private readonly ITagRepository _tagRepository;

    public GetTagsQueryHandler(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task<Result<List<TagDto>>> Handle(GetTagsQuery request, CancellationToken cancellationToken)
    {
        var tags = await _tagRepository.GetByUserIdAsync(request.UserId, cancellationToken);
        var dtos = tags.Select(t => new TagDto(t.Id, t.Name, t.CreatedAt)).ToList();
        return Result<List<TagDto>>.Ok(dtos);
    }
}
