using FluentAssertions;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using Notes.Infrastructure.Persistence.Repositories;

namespace Notes.Infrastructure.Tests.Persistence;

/// <summary>
/// Tasks 4.5 & 4.6: Integration tests for UserRepository.
/// </summary>
[Collection("Postgres")]
public sealed class UserRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public UserRepositoryTests(PostgresFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task AddAsync_AndGetByIdAsync_ReturnsUser()
    {
        await using var db = _fixture.CreateDbContext();
        var repo = new UserRepository(db);

        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email($"repo-{userId:N}@example.com"), "Repo User", "$2b$12$fakehash");

        await repo.AddAsync(user);
        await db.SaveChangesAsync();

        var found = await repo.GetByIdAsync(userId);
        found.Should().NotBeNull();
        found!.Id.Should().Be(userId);
        found.DisplayName.Should().Be("Repo User");
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentId_ReturnsNull()
    {
        await using var db = _fixture.CreateDbContext();
        var repo = new UserRepository(db);

        var result = await repo.GetByIdAsync(Guid.NewGuid());
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByEmailAsync_ExistingEmail_ReturnsUser()
    {
        await using var db = _fixture.CreateDbContext();
        var repo = new UserRepository(db);

        var email = $"email-lookup-{Guid.NewGuid():N}@example.com";
        var user = User.CreateLocal(Guid.NewGuid(), new Email(email), "Email Lookup", "$2b$12$fakehash");

        await repo.AddAsync(user);
        await db.SaveChangesAsync();

        var found = await repo.GetByEmailAsync(email);
        found.Should().NotBeNull();
        found!.Email.Value.Should().Be(email);
    }

    [Fact]
    public async Task GetByEmailAsync_NonExistentEmail_ReturnsNull()
    {
        await using var db = _fixture.CreateDbContext();
        var repo = new UserRepository(db);

        var result = await repo.GetByEmailAsync("nobody@nowhere.com");
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_PersistsDisplayNameChange()
    {
        // Setup: create user
        var userId = Guid.NewGuid();
        await using (var writeDb = _fixture.CreateDbContext())
        {
            var writeRepo = new UserRepository(writeDb);
            var user = User.CreateLocal(userId, new Email($"update-{userId:N}@example.com"), "Original Name", "$2b$12$fakehash");
            await writeRepo.AddAsync(user);
            await writeDb.SaveChangesAsync();
        }

        // Mutate in a second context
        await using (var updateDb = _fixture.CreateDbContext())
        {
            var updateRepo = new UserRepository(updateDb);
            var user = await updateRepo.GetByIdAsync(userId);
            user!.UpdateDisplayName("Updated Name");
            await updateRepo.UpdateAsync(user);
            await updateDb.SaveChangesAsync();
        }

        // Verify with a third clean context
        await using var readDb = _fixture.CreateDbContext();
        var readRepo = new UserRepository(readDb);
        var found = await readRepo.GetByIdAsync(userId);
        found!.DisplayName.Should().Be("Updated Name");
    }
}
