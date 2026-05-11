using Microsoft.EntityFrameworkCore;
using Notes.Application.Common.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence.Repositories;

public sealed class SharedLinkRepository : ISharedLinkRepository
{
    private readonly ApplicationDbContext _db;

    public SharedLinkRepository(ApplicationDbContext db) => _db = db;

    public Task<SharedLink?> GetByTokenAsync(string token, CancellationToken ct = default)
        => _db.SharedLinks.AsNoTracking().FirstOrDefaultAsync(s => s.Token == token, ct);

    public Task<List<SharedLink>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
        => _db.SharedLinks.AsNoTracking().Where(s => s.UserId == userId).ToListAsync(ct);

    public Task<List<SharedLink>> GetByNoteIdAsync(Guid noteId, CancellationToken ct = default)
        => _db.SharedLinks.AsNoTracking().Where(s => s.NoteId == noteId).ToListAsync(ct);

    public async Task AddAsync(SharedLink link, CancellationToken ct = default)
        => await _db.SharedLinks.AddAsync(link, ct);

    public async Task RevokeAsync(Guid id, CancellationToken ct = default)
    {
        var link = await _db.SharedLinks.FirstOrDefaultAsync(s => s.Id == id, ct);
        link?.Revoke();
    }
}
