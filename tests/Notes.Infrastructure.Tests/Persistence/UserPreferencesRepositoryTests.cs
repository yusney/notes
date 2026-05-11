using FluentAssertions;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using Notes.Domain.ValueObjects;
using Notes.Infrastructure.Persistence.Repositories;

namespace Notes.Infrastructure.Tests.Persistence;

/// <summary>
/// TDD tests for UserPreferencesRepository.
/// Task 2.5 + 2.6
/// </summary>
[Collection("Postgres")]
public sealed class UserPreferencesRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public UserPreferencesRepositoryTests(PostgresFixture fixture) => _fixture = fixture;

    private async Task<Guid> CreateUserAsync()
    {
        await using var db = _fixture.CreateDbContext();
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email($"pref-user-{userId:N}@example.com"), "Prefs User", "$2b$12$fakehash");
        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();
        return userId;
    }

    [Fact]
    public async Task AddAsync_ThenGetByUserIdAsync_ReturnsPreferences()
    {
        var userId = await CreateUserAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new UserPreferencesRepository(db);

        var prefs = UserPreferences.Create(userId);
        await repo.AddAsync(prefs);
        await db.SaveChangesAsync();

        var found = await repo.GetByUserIdAsync(userId);
        found.Should().NotBeNull();
        found!.UserId.Should().Be(userId);
        found.Theme.Should().Be(Theme.System);
        found.SortBy.Should().Be(SortBy.CreatedAt);
        found.SortOrder.Should().Be(SortOrder.Desc);
    }

    [Fact]
    public async Task UpdateAsync_ChangesPreferences()
    {
        var userId = await CreateUserAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new UserPreferencesRepository(db);

        var prefs = UserPreferences.Create(userId);
        await repo.AddAsync(prefs);
        await db.SaveChangesAsync();

        prefs.Update(Theme.Dark, SortBy.Title, SortOrder.Asc);
        await repo.UpdateAsync(prefs);
        await db.SaveChangesAsync();

        await using var db2 = _fixture.CreateDbContext();
        var repo2 = new UserPreferencesRepository(db2);
        var updated = await repo2.GetByUserIdAsync(userId);
        updated.Should().NotBeNull();
        updated!.Theme.Should().Be(Theme.Dark);
        updated.SortBy.Should().Be(SortBy.Title);
        updated.SortOrder.Should().Be(SortOrder.Asc);
    }

    [Fact]
    public async Task GetByUserIdAsync_WhenNoPreferences_ReturnsNull()
    {
        var userId = await CreateUserAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new UserPreferencesRepository(db);

        var result = await repo.GetByUserIdAsync(userId);
        result.Should().BeNull();
    }
}
