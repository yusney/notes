using FluentAssertions;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using Notes.Infrastructure.Persistence.Repositories;

namespace Notes.Infrastructure.Tests.Persistence;

/// <summary>
/// Tasks 4.9 & 4.10: Integration tests for NoteRepository including FTS search.
/// </summary>
[Collection("Postgres")]
public sealed class NoteRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public NoteRepositoryTests(PostgresFixture fixture) => _fixture = fixture;

    private async Task<(Guid userId, Guid tabId)> CreateUserAndTabAsync()
    {
        await using var db = _fixture.CreateDbContext();
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();

        var user = User.CreateLocal(userId, new Email($"note-user-{userId:N}@example.com"), "Note User", "$2b$12$fakehash");
        var tab = new Tab(tabId, userId, $"Notes Tab {userId:N}", 0);

        await db.Users.AddAsync(user);
        await db.Tabs.AddAsync(tab);
        await db.SaveChangesAsync();

        return (userId, tabId);
    }

    [Fact]
    public async Task AddAsync_AndGetByIdAsync_ReturnsNote()
    {
        var (userId, tabId) = await CreateUserAndTabAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new NoteRepository(db);

        var noteId = Guid.NewGuid();
        var note = new Note(noteId, userId, tabId, "My Note Title", "Some content here", "en", DateTime.UtcNow);

        await repo.AddAsync(note);
        await db.SaveChangesAsync();

        var found = await repo.GetByIdAsync(noteId);
        found.Should().NotBeNull();
        found!.Title.Should().Be("My Note Title");
        found.Content.Should().Be("Some content here");
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ReturnsNull()
    {
        await using var db = _fixture.CreateDbContext();
        var repo = new NoteRepository(db);

        var result = await repo.GetByIdAsync(Guid.NewGuid());
        result.Should().BeNull();
    }

    [Fact]
    public async Task SearchAsync_EmptyQuery_ReturnsAllUserNotes()
    {
        var (userId, tabId) = await CreateUserAndTabAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new NoteRepository(db);

        await repo.AddAsync(new Note(Guid.NewGuid(), userId, tabId, "Note 1", "Content 1", "en", DateTime.UtcNow));
        await repo.AddAsync(new Note(Guid.NewGuid(), userId, tabId, "Note 2", "Content 2", "en", DateTime.UtcNow.AddSeconds(1)));
        await db.SaveChangesAsync();

        var results = await repo.SearchAsync(userId, "", 0, 10);
        results.Should().HaveCount(2);
    }

    [Fact]
    public async Task SearchAsync_WithFtsQuery_ReturnsMatchingNotes()
    {
        var (userId, tabId) = await CreateUserAndTabAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new NoteRepository(db);

        await repo.AddAsync(new Note(Guid.NewGuid(), userId, tabId, "Kubernetes deployment guide", "How to deploy on k8s", "en", DateTime.UtcNow));
        await repo.AddAsync(new Note(Guid.NewGuid(), userId, tabId, "Docker tutorial", "Container fundamentals", "en", DateTime.UtcNow.AddSeconds(1)));
        await db.SaveChangesAsync();

        var results = await repo.SearchAsync(userId, "kubernetes", 0, 10);
        results.Should().HaveCount(1);
        results[0].Title.Should().Contain("Kubernetes");
    }

    [Fact]
    public async Task SearchAsync_DoesNotReturnOtherUsersNotes()
    {
        var (userId1, tabId1) = await CreateUserAndTabAsync();
        var (userId2, _) = await CreateUserAndTabAsync();

        await using var writeDb = _fixture.CreateDbContext();
        await writeDb.Notes.AddAsync(new Note(Guid.NewGuid(), userId1, tabId1, "Shared keyword note", "authentication token", "en", DateTime.UtcNow));
        await writeDb.SaveChangesAsync();

        await using var db = _fixture.CreateDbContext();
        var repo = new NoteRepository(db);

        var resultsForUser2 = await repo.SearchAsync(userId2, "authentication", 0, 10);
        resultsForUser2.Should().BeEmpty("user2 should not see user1's notes");
    }

    [Fact]
    public async Task SearchAsync_Pagination_WorksCorrectly()
    {
        var (userId, tabId) = await CreateUserAndTabAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new NoteRepository(db);

        // Add 5 notes with "pagination" keyword
        for (var i = 0; i < 5; i++)
        {
            await repo.AddAsync(new Note(Guid.NewGuid(), userId, tabId, $"Pagination test {i}", "pagination content here", "en", DateTime.UtcNow.AddSeconds(i)));
        }
        await db.SaveChangesAsync();

        var page1 = await repo.SearchAsync(userId, "pagination", 0, 3);
        var page2 = await repo.SearchAsync(userId, "pagination", 3, 3);

        page1.Should().HaveCount(3);
        page2.Should().HaveCount(2);
    }

    [Fact]
    public async Task CountSearchAsync_ReturnsCorrectCount()
    {
        var (userId, tabId) = await CreateUserAndTabAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new NoteRepository(db);

        await repo.AddAsync(new Note(Guid.NewGuid(), userId, tabId, "Count search note A", "architecture patterns", "en", DateTime.UtcNow));
        await repo.AddAsync(new Note(Guid.NewGuid(), userId, tabId, "Count search note B", "architecture design", "en", DateTime.UtcNow.AddSeconds(1)));
        await repo.AddAsync(new Note(Guid.NewGuid(), userId, tabId, "Unrelated note", "something else entirely", "en", DateTime.UtcNow.AddSeconds(2)));
        await db.SaveChangesAsync();

        var count = await repo.CountSearchAsync(userId, "architecture");
        count.Should().Be(2);
    }

    [Fact]
    public async Task UpdateAsync_PersistsChanges()
    {
        var (userId, tabId) = await CreateUserAndTabAsync();
        var noteId = Guid.NewGuid();

        await using (var writeDb = _fixture.CreateDbContext())
        {
            await writeDb.Notes.AddAsync(new Note(noteId, userId, tabId, "Original Title", "original content", "en", DateTime.UtcNow));
            await writeDb.SaveChangesAsync();
        }

        await using (var updateDb = _fixture.CreateDbContext())
        {
            var repo = new NoteRepository(updateDb);
            var note = await repo.GetByIdAsync(noteId);
            note!.Update("Updated Title", "updated content");
            await repo.UpdateAsync(note);
            await updateDb.SaveChangesAsync();
        }

        await using var readDb = _fixture.CreateDbContext();
        var found = await new NoteRepository(readDb).GetByIdAsync(noteId);
        found!.Title.Should().Be("Updated Title");
        found.Content.Should().Be("updated content");
    }

    [Fact]
    public async Task DeleteAsync_RemovesNote()
    {
        var (userId, tabId) = await CreateUserAndTabAsync();
        var noteId = Guid.NewGuid();

        await using (var writeDb = _fixture.CreateDbContext())
        {
            await writeDb.Notes.AddAsync(new Note(noteId, userId, tabId, "To Delete", "content", "en", DateTime.UtcNow));
            await writeDb.SaveChangesAsync();
        }

        await using (var deleteDb = _fixture.CreateDbContext())
        {
            var repo = new NoteRepository(deleteDb);
            await repo.DeleteAsync(noteId);
            await deleteDb.SaveChangesAsync();
        }

        await using var readDb = _fixture.CreateDbContext();
        var found = await new NoteRepository(readDb).GetByIdAsync(noteId);
        found.Should().BeNull();
    }
}
