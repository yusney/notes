using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tags.Queries.GetTags;

public record TagDto(Guid Id, string Name, DateTime CreatedAt);

public record GetTagsQuery(Guid UserId) : IRequest<Result<List<TagDto>>>;
