using Microsoft.EntityFrameworkCore;
using Notes.Application.Common.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence.Repositories;

public sealed class TabRepository : ITabRepository
{
    private readonly ApplicationDbContext _db;

    public TabRepository(ApplicationDbContext db) => _db = db;

    public Task<Tab?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.Tabs.FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<List<Tab>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
        => _db.Tabs.Where(t => t.UserId == userId).OrderBy(t => t.Order).ToListAsync(ct);

    public Task<int> CountByUserIdAsync(Guid userId, CancellationToken ct = default)
        => _db.Tabs.CountAsync(t => t.UserId == userId, ct);

    public async Task AddAsync(Tab tab, CancellationToken ct = default)
        => await _db.Tabs.AddAsync(tab, ct);

    public Task UpdateAsync(Tab tab, CancellationToken ct = default)
    {
        _db.Tabs.Update(tab);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var tab = await GetByIdAsync(id, ct);
        if (tab is not null)
            _db.Tabs.Remove(tab);
    }
}
