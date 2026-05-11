using Microsoft.EntityFrameworkCore;
using Notes.Application.Common.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence.Repositories;

public sealed class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly ApplicationDbContext _db;

    public PasswordResetTokenRepository(ApplicationDbContext db) => _db = db;

    public Task<PasswordResetToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default)
        => _db.PasswordResetTokens.FirstOrDefaultAsync(prt => prt.TokenHash == tokenHash, ct);

    public async Task AddAsync(PasswordResetToken token, CancellationToken ct = default)
        => await _db.PasswordResetTokens.AddAsync(token, ct);

    public Task DeleteAsync(PasswordResetToken token, CancellationToken ct = default)
    {
        _db.PasswordResetTokens.Remove(token);
        return Task.CompletedTask;
    }

    public async Task<int> DeleteExpiredAsync(DateTime cutoff, CancellationToken ct = default)
    {
        var expired = await _db.PasswordResetTokens
            .Where(prt => prt.ExpiresAt < cutoff)
            .ToListAsync(ct);

        _db.PasswordResetTokens.RemoveRange(expired);
        return expired.Count;
    }
}
