using Notes.Domain.Entities;

namespace Notes.Application.Common.Interfaces;

public interface IUserPreferencesRepository
{
    Task<UserPreferences?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(UserPreferences preferences, CancellationToken ct = default);
    Task UpdateAsync(UserPreferences preferences, CancellationToken ct = default);
}
