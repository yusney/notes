using FluentAssertions;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using Notes.Infrastructure.Persistence.Repositories;

namespace Notes.Infrastructure.Tests.Persistence;

/// <summary>
/// Tasks 4.7 & 4.8: Integration tests for TabRepository.
/// </summary>
[Collection("Postgres")]
public sealed class TabRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public TabRepositoryTests(PostgresFixture fixture) => _fixture = fixture;

    private async Task<Guid> CreateUserAsync()
    {
        await using var db = _fixture.CreateDbContext();
        var repo = new UserRepository(db);
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email($"tab-user-{userId:N}@example.com"), "Tab User", "$2b$12$fakehash");
        await repo.AddAsync(user);
        await db.SaveChangesAsync();
        return userId;
    }

    [Fact]
    public async Task AddAsync_AndGetByIdAsync_ReturnsTab()
    {
        var userId = await CreateUserAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new TabRepository(db);

        var tabId = Guid.NewGuid();
        var tab = new Tab(tabId, userId, "My First Tab", 0);

        await repo.AddAsync(tab);
        await db.SaveChangesAsync();

        var found = await repo.GetByIdAsync(tabId);
        found.Should().NotBeNull();
        found!.Name.Should().Be("My First Tab");
        found.UserId.Should().Be(userId);
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ReturnsNull()
    {
        await using var db = _fixture.CreateDbContext();
        var repo = new TabRepository(db);

        var result = await repo.GetByIdAsync(Guid.NewGuid());
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByUserIdAsync_ReturnsAllTabsOrderedByOrder()
    {
        var userId = await CreateUserAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new TabRepository(db);

        var tab2 = new Tab(Guid.NewGuid(), userId, "Tab B", 1);
        var tab1 = new Tab(Guid.NewGuid(), userId, "Tab A", 0);
        var tab3 = new Tab(Guid.NewGuid(), userId, "Tab C", 2);

        await repo.AddAsync(tab2);
        await repo.AddAsync(tab1);
        await repo.AddAsync(tab3);
        await db.SaveChangesAsync();

        var results = await repo.GetByUserIdAsync(userId);
        results.Should().HaveCount(3);
        results[0].Order.Should().Be(0);
        results[1].Order.Should().Be(1);
        results[2].Order.Should().Be(2);
    }

    [Fact]
    public async Task GetByUserIdAsync_AnotherUser_ReturnsEmpty()
    {
        await using var db = _fixture.CreateDbContext();
        var repo = new TabRepository(db);

        var results = await repo.GetByUserIdAsync(Guid.NewGuid());
        results.Should().BeEmpty();
    }

    [Fact]
    public async Task CountByUserIdAsync_ReturnsCorrectCount()
    {
        var userId = await CreateUserAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new TabRepository(db);

        await repo.AddAsync(new Tab(Guid.NewGuid(), userId, "Count Tab 1", 0));
        await repo.AddAsync(new Tab(Guid.NewGuid(), userId, "Count Tab 2", 1));
        await db.SaveChangesAsync();

        var count = await repo.CountByUserIdAsync(userId);
        count.Should().Be(2);
    }

    [Fact]
    public async Task UpdateAsync_PersistsRename()
    {
        var userId = await CreateUserAsync();
        var tabId = Guid.NewGuid();

        await using (var writeDb = _fixture.CreateDbContext())
        {
            var repo = new TabRepository(writeDb);
            await repo.AddAsync(new Tab(tabId, userId, "Old Name", 0));
            await writeDb.SaveChangesAsync();
        }

        await using (var updateDb = _fixture.CreateDbContext())
        {
            var repo = new TabRepository(updateDb);
            var tab = await repo.GetByIdAsync(tabId);
            tab!.Rename("New Name");
            await repo.UpdateAsync(tab);
            await updateDb.SaveChangesAsync();
        }

        await using var readDb = _fixture.CreateDbContext();
        var found = await new TabRepository(readDb).GetByIdAsync(tabId);
        found!.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task DeleteAsync_RemovesTab()
    {
        var userId = await CreateUserAsync();
        var tabId = Guid.NewGuid();

        await using (var writeDb = _fixture.CreateDbContext())
        {
            var repo = new TabRepository(writeDb);
            await repo.AddAsync(new Tab(tabId, userId, "To Delete", 0));
            await writeDb.SaveChangesAsync();
        }

        await using (var deleteDb = _fixture.CreateDbContext())
        {
            var repo = new TabRepository(deleteDb);
            await repo.DeleteAsync(tabId);
            await deleteDb.SaveChangesAsync();
        }

        await using var readDb = _fixture.CreateDbContext();
        var found = await new TabRepository(readDb).GetByIdAsync(tabId);
        found.Should().BeNull();
    }
}
