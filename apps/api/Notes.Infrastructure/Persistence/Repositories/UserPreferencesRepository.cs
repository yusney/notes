using Microsoft.EntityFrameworkCore;
using Notes.Application.Common.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence.Repositories;

public sealed class UserPreferencesRepository : IUserPreferencesRepository
{
    private readonly ApplicationDbContext _db;

    public UserPreferencesRepository(ApplicationDbContext db) => _db = db;

    public Task<UserPreferences?> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
        => _db.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId, ct);

    public async Task AddAsync(UserPreferences preferences, CancellationToken ct = default)
        => await _db.UserPreferences.AddAsync(preferences, ct);

    public Task UpdateAsync(UserPreferences preferences, CancellationToken ct = default)
    {
        _db.UserPreferences.Update(preferences);
        return Task.CompletedTask;
    }
}
