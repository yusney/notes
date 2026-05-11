using Microsoft.EntityFrameworkCore;
using NpgsqlTypes;
using Notes.Application.Common.Interfaces;
using Notes.Domain.Entities;
using Notes.Domain.Enums;

namespace Notes.Infrastructure.Persistence.Repositories;

public sealed class NoteRepository : INoteRepository
{
    private readonly ApplicationDbContext _db;

    public NoteRepository(ApplicationDbContext db) => _db = db;

    public Task<Note?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.Notes.Include(n => n.Tags).FirstOrDefaultAsync(n => n.Id == id, ct);

    public Task<List<Note>> SearchAsync(
        Guid userId, string query, int skip, int take,
        Guid? tabId = null, List<Guid>? tagIds = null,
        SortBy sortBy = SortBy.CreatedAt, SortOrder sortOrder = SortOrder.Desc,
        bool isFavoriteOnly = false, CancellationToken ct = default)
    {
        var q = BuildQuery(userId, query, tabId, tagIds, isFavoriteOnly);

        q = ApplySort(q, sortBy, sortOrder);

        return q.Include(n => n.Tags)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);
    }

    public Task<int> CountSearchAsync(
        Guid userId, string query,
        Guid? tabId = null, List<Guid>? tagIds = null,
        bool isFavoriteOnly = false, CancellationToken ct = default)
        => BuildQuery(userId, query, tabId, tagIds, isFavoriteOnly).CountAsync(ct);

    public Task<List<Note>> GetAllForUserAsync(Guid userId, CancellationToken ct = default)
        => _db.Notes.Include(n => n.Tags).Where(n => n.UserId == userId).ToListAsync(ct);

    public async Task AddAsync(Note note, CancellationToken ct = default)
        => await _db.Notes.AddAsync(note, ct);

    public Task UpdateAsync(Note note, CancellationToken ct = default)
    {
        _db.Notes.Update(note);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var note = await GetByIdAsync(id, ct);
        if (note is not null)
            _db.Notes.Remove(note);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private IQueryable<Note> BuildQuery(
        Guid userId, string query,
        Guid? tabId, List<Guid>? tagIds,
        bool isFavoriteOnly = false)
    {
        IQueryable<Note> q = _db.Notes.Where(n => n.UserId == userId);

        if (tabId.HasValue)
            q = q.Where(n => n.TabId == tabId.Value);

        if (isFavoriteOnly)
            q = q.Where(n => n.IsFavorite);

        if (tagIds is { Count: > 0 })
        {
            // AND-logic: note must have ALL requested tags
            q = q.Where(n =>
                n.Tags.Count(t => tagIds.Contains(t.Id)) == tagIds.Count);
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            // FTS only available on relational (Postgres) — InMemory uses LIKE fallback
            if (_db.Database.IsRelational())
            {
                var searchTerm = $"%{query.Trim()}%";
                q = q.Where(n =>
                    EF.Property<NpgsqlTsVector>(n, "SearchVector")
                        .Matches(EF.Functions.PlainToTsQuery("english", query.Trim())) ||
                    EF.Functions.ILike(n.Title, searchTerm) ||
                    EF.Functions.ILike(n.Content, searchTerm));
            }
            else
            {
                var lower = query.ToLower();
                q = q.Where(n =>
                    n.Title.ToLower().Contains(lower) ||
                    (n.Content != null && n.Content.ToLower().Contains(lower)));
            }
        }

        return q;
    }

    private static IQueryable<Note> ApplySort(IQueryable<Note> q, SortBy sortBy, SortOrder sortOrder)
    {
        return (sortBy, sortOrder) switch
        {
            (SortBy.Title, SortOrder.Asc) => q.OrderBy(n => n.Title),
            (SortBy.Title, SortOrder.Desc) => q.OrderByDescending(n => n.Title),
            (SortBy.UpdatedAt, SortOrder.Asc) => q.OrderBy(n => n.UpdatedAt),
            (SortBy.UpdatedAt, SortOrder.Desc) => q.OrderByDescending(n => n.UpdatedAt),
            (SortBy.CreatedAt, SortOrder.Asc) => q.OrderBy(n => n.CreatedAt),
            _ => q.OrderByDescending(n => n.CreatedAt), // default: CreatedAt Desc
        };
    }
}
