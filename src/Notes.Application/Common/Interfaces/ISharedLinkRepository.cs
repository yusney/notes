using Notes.Domain.Entities;

namespace Notes.Application.Common.Interfaces;

public interface ISharedLinkRepository
{
    Task<SharedLink?> GetByTokenAsync(string token, CancellationToken ct = default);
    Task<List<SharedLink>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<List<SharedLink>> GetByNoteIdAsync(Guid noteId, CancellationToken ct = default);
    Task AddAsync(SharedLink link, CancellationToken ct = default);
    Task RevokeAsync(Guid id, CancellationToken ct = default);
}
