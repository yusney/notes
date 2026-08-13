using MediatR;
using Notes.Application.Common.Models;
using Notes.Domain.Enums;

namespace Notes.Application.Features.Notes.Queries.SearchNotes;

public record SearchNotesQuery(
    Guid UserId,
    string Query,
    int Page = 1,
    int PageSize = 20,
    Guid? TabId = null,
    List<Guid>? TagIds = null,
    SortBy SortBy = SortBy.CreatedAt,
    SortOrder SortOrder = SortOrder.Desc,
    bool IsFavoriteOnly = false) : IRequest<Result<PagedResult<NoteDto>>>;

public record TagDto(Guid Id, string Name);

public record NoteDto(
    Guid Id,
    Guid TabId,
    string Title,
    string Language,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<TagDto> Tags,
    bool IsFavorite = false,
    DateTime? FavoritedAt = null);

public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);
