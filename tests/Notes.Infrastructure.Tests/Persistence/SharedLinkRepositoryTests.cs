using FluentAssertions;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using Notes.Infrastructure.Persistence.Repositories;

namespace Notes.Infrastructure.Tests.Persistence;

/// <summary>
/// Integration tests for SharedLinkRepository using real Postgres (Testcontainers).
/// </summary>
[Collection("Postgres")]
public sealed class SharedLinkRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public SharedLinkRepositoryTests(PostgresFixture fixture) => _fixture = fixture;

    private async Task<(Guid userId, Guid noteId)> CreateUserNoteAsync()
    {
        await using var db = _fixture.CreateDbContext();
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var noteId = Guid.NewGuid();

        var user = User.CreateLocal(userId, new Email($"share-user-{userId:N}@example.com"), "Share User", "$2b$12$fakehash");
        var tab = new Tab(tabId, userId, $"Share Tab {userId:N}", 0);
        var note = new Note(noteId, userId, tabId, "Shareable Note", "Content here", "en", DateTime.UtcNow);

        await db.Users.AddAsync(user);
        await db.Tabs.AddAsync(tab);
        await db.Notes.AddAsync(note);
        await db.SaveChangesAsync();

        return (userId, noteId);
    }

    [Fact]
    public async Task AddAsync_AndGetByTokenAsync_ReturnsLink()
    {
        var (userId, noteId) = await CreateUserNoteAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new SharedLinkRepository(db);

        var link = SharedLink.Create(noteId, userId);
        await repo.AddAsync(link);
        await db.SaveChangesAsync();

        var found = await repo.GetByTokenAsync(link.Token);

        found.Should().NotBeNull();
        found!.NoteId.Should().Be(noteId);
        found.UserId.Should().Be(userId);
        found.Token.Should().Be(link.Token);
    }

    [Fact]
    public async Task GetByUserIdAsync_ReturnLinksForUser()
    {
        var (userId, noteId) = await CreateUserNoteAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new SharedLinkRepository(db);

        var link1 = SharedLink.Create(noteId, userId);
        var link2 = SharedLink.Create(noteId, userId);
        await repo.AddAsync(link1);
        await repo.AddAsync(link2);
        await db.SaveChangesAsync();

        var links = await repo.GetByUserIdAsync(userId);

        links.Should().HaveCountGreaterThanOrEqualTo(2);
        links.Should().AllSatisfy(l => l.UserId.Should().Be(userId));
    }

    [Fact]
    public async Task RevokeAsync_SetsRevokedAt()
    {
        var (userId, noteId) = await CreateUserNoteAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new SharedLinkRepository(db);

        var link = SharedLink.Create(noteId, userId);
        await repo.AddAsync(link);
        await db.SaveChangesAsync();

        await repo.RevokeAsync(link.Id);
        await db.SaveChangesAsync();

        var found = await repo.GetByTokenAsync(link.Token);
        found!.RevokedAt.Should().NotBeNull();
        found.IsActive(DateTime.UtcNow).Should().BeFalse();
    }
}
