using Microsoft.EntityFrameworkCore;
using Notes.Application.Common.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence.Repositories;

public sealed class TagRepository : ITagRepository
{
    private readonly ApplicationDbContext _db;

    public TagRepository(ApplicationDbContext db) => _db = db;

    public Task<Tag?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.Tags.FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<List<Tag>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
        => _db.Tags.Where(t => t.UserId == userId)
            .OrderBy(t => t.Name)
            .ToListAsync(ct);

    public Task<List<Tag>> GetByNamesAsync(Guid userId, IEnumerable<string> names, CancellationToken ct = default)
    {
        var nameList = names.Select(n => n.Trim().ToLower()).ToList();
        return _db.Tags
            .Where(t => t.UserId == userId && nameList.Contains(t.Name.ToLower()))
            .ToListAsync(ct);
    }

    public async Task AddAsync(Tag tag, CancellationToken ct = default)
        => await _db.Tags.AddAsync(tag, ct);

    public Task UpdateAsync(Tag tag, CancellationToken ct = default)
    {
        _db.Tags.Update(tag);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var tag = await GetByIdAsync(id, ct);
        if (tag is not null)
            _db.Tags.Remove(tag);
    }
}
