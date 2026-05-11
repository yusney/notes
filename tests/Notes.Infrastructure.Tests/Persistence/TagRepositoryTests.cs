using FluentAssertions;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using Notes.Infrastructure.Persistence.Repositories;

namespace Notes.Infrastructure.Tests.Persistence;

[Collection("Postgres")]
public sealed class TagRepositoryTests
{
    private readonly PostgresFixture _fixture;

    public TagRepositoryTests(PostgresFixture fixture) => _fixture = fixture;

    private async Task<Guid> CreateUserAsync()
    {
        await using var db = _fixture.CreateDbContext();
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email($"tag-user-{userId:N}@example.com"), "Tag User", "$2b$12$fakehash");
        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();
        return userId;
    }

    [Fact]
    public async Task AddAsync_ThenGetByUserId_ReturnsTag()
    {
        var userId = await CreateUserAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new TagRepository(db);

        var tag = Tag.Create(userId, "important");
        await repo.AddAsync(tag);
        await db.SaveChangesAsync();

        var tags = await repo.GetByUserIdAsync(userId);
        tags.Should().ContainSingle(t => t.Name == "important");
    }

    [Fact]
    public async Task GetByNamesAsync_ReturnsMatchingTags()
    {
        var userId = await CreateUserAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new TagRepository(db);

        var tag1 = Tag.Create(userId, "work");
        var tag2 = Tag.Create(userId, "personal");
        await repo.AddAsync(tag1);
        await repo.AddAsync(tag2);
        await db.SaveChangesAsync();

        var found = await repo.GetByNamesAsync(userId, ["work"]);
        found.Should().ContainSingle(t => t.Name == "work");
    }

    [Fact]
    public async Task DeleteAsync_RemovesTag()
    {
        var userId = await CreateUserAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new TagRepository(db);

        var tag = Tag.Create(userId, $"deleteme-{Guid.NewGuid():N}");
        await repo.AddAsync(tag);
        await db.SaveChangesAsync();

        await repo.DeleteAsync(tag.Id);
        await db.SaveChangesAsync();

        var tags = await repo.GetByUserIdAsync(userId);
        tags.Should().NotContain(t => t.Id == tag.Id);
    }

    [Fact]
    public async Task UniqueIndex_PreventsDuplicateTagNamePerUser()
    {
        var userId = await CreateUserAsync();
        await using var db = _fixture.CreateDbContext();
        var repo = new TagRepository(db);

        await repo.AddAsync(Tag.Create(userId, "unique-tag"));
        await db.SaveChangesAsync();

        await repo.AddAsync(Tag.Create(userId, "unique-tag"));
        var act = async () => await db.SaveChangesAsync();
        await act.Should().ThrowAsync<Exception>();
    }
}
