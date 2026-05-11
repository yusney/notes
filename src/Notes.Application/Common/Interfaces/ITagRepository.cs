using Notes.Domain.Entities;

namespace Notes.Application.Common.Interfaces;

public interface ITagRepository
{
    Task<Tag?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<Tag>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<List<Tag>> GetByNamesAsync(Guid userId, IEnumerable<string> names, CancellationToken ct = default);
    Task AddAsync(Tag tag, CancellationToken ct = default);
    Task UpdateAsync(Tag tag, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
