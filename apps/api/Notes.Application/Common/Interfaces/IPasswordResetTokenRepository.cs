using Notes.Domain.Entities;

namespace Notes.Application.Common.Interfaces;

public interface IPasswordResetTokenRepository
{
    Task<PasswordResetToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default);
    Task AddAsync(PasswordResetToken token, CancellationToken ct = default);
    Task DeleteAsync(PasswordResetToken token, CancellationToken ct = default);
    Task<int> DeleteExpiredAsync(DateTime cutoff, CancellationToken ct = default);
}
