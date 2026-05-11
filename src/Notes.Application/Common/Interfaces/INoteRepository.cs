using Notes.Domain.Entities;
using Notes.Domain.Enums;

namespace Notes.Application.Common.Interfaces;

public interface INoteRepository
{
    Task<Note?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<Note>> SearchAsync(Guid userId, string query, int skip, int take,
        Guid? tabId = null, List<Guid>? tagIds = null,
        SortBy sortBy = SortBy.CreatedAt, SortOrder sortOrder = SortOrder.Desc,
        bool isFavoriteOnly = false, CancellationToken ct = default);
    Task<int> CountSearchAsync(Guid userId, string query,
        Guid? tabId = null, List<Guid>? tagIds = null,
        bool isFavoriteOnly = false, CancellationToken ct = default);
    Task<List<Note>> GetAllForUserAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(Note note, CancellationToken ct = default);
    Task UpdateAsync(Note note, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
