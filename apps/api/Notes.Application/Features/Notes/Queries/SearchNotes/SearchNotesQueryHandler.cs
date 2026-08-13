using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Queries.SearchNotes;

public class SearchNotesQueryHandler : IRequestHandler<SearchNotesQuery, Result<PagedResult<NoteDto>>>
{
    private readonly INoteRepository _noteRepository;

    public SearchNotesQueryHandler(INoteRepository noteRepository)
    {
        _noteRepository = noteRepository;
    }

    public async Task<Result<PagedResult<NoteDto>>> Handle(
        SearchNotesQuery request, CancellationToken cancellationToken)
    {
        var skip = (request.Page - 1) * request.PageSize;

        var notes = await _noteRepository.SearchAsync(
            request.UserId, request.Query, skip, request.PageSize,
            request.TabId, request.TagIds,
            request.SortBy, request.SortOrder, request.IsFavoriteOnly, cancellationToken);

        var total = await _noteRepository.CountSearchAsync(
            request.UserId, request.Query,
            request.TabId, request.TagIds, request.IsFavoriteOnly, cancellationToken);

        var dtos = notes.Select(n => new NoteDto(
            n.Id, n.TabId, n.Title, n.Language, n.CreatedAt, n.UpdatedAt,
            n.Tags.Select(t => new TagDto(t.Id, t.Name)).ToList(),
            n.IsFavorite, n.FavoritedAt
        )).ToList();

        var paged = new PagedResult<NoteDto>(dtos, total, request.Page, request.PageSize);

        return Result<PagedResult<NoteDto>>.Ok(paged);
    }
}
