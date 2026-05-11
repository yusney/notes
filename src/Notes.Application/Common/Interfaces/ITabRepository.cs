using Notes.Domain.Entities;

namespace Notes.Application.Common.Interfaces;

public interface ITabRepository
{
    Task<Tab?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<Tab>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<int> CountByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(Tab tab, CancellationToken ct = default);
    Task UpdateAsync(Tab tab, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
