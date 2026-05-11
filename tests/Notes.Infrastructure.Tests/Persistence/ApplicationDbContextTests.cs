using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using Notes.Domain.ValueObjects;
using Notes.Infrastructure.Persistence;

namespace Notes.Infrastructure.Tests.Persistence;

/// <summary>
/// Task 4.1: Integration tests for ApplicationDbContext EF Core configuration.
/// Validates schema, constraints, and computed columns using a real PostgreSQL container.
/// </summary>
[Collection("Postgres")]
public sealed class ApplicationDbContextTests
{
    private readonly PostgresFixture _fixture;

    public ApplicationDbContextTests(PostgresFixture fixture) => _fixture = fixture;

    [Fact]
    public async Task DbContext_CanConnectToDatabase()
    {
        await using var db = _fixture.CreateDbContext();
        var canConnect = await db.Database.CanConnectAsync();
        canConnect.Should().BeTrue();
    }

    [Fact]
    public async Task DbContext_SavesAndRetrievesUser()
    {
        await using var db = _fixture.CreateDbContext();
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email("ctx-test@example.com"), "CTX Test", "$2b$12$fakehashedpassword12345");

        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();

        await using var readDb = _fixture.CreateDbContext();
        var found = await readDb.Users.FirstOrDefaultAsync(u => u.Id == userId);

        found.Should().NotBeNull();
        found!.Email.Value.Should().Be("ctx-test@example.com");
        found.DisplayName.Should().Be("CTX Test");
    }

    [Fact]
    public async Task DbContext_EmailIsUnique_ThrowsOnDuplicate()
    {
        await using var db = _fixture.CreateDbContext();
        var email = $"unique-ctx-{Guid.NewGuid():N}@example.com";
        var user1 = User.CreateLocal(Guid.NewGuid(), new Email(email), "User 1", "$2b$12$hash1");
        var user2 = User.CreateLocal(Guid.NewGuid(), new Email(email), "User 2", "$2b$12$hash2");

        await db.Users.AddAsync(user1);
        await db.SaveChangesAsync();

        await db.Users.AddAsync(user2);
        var act = () => db.SaveChangesAsync();
        await act.Should().ThrowAsync<Exception>();
    }

    [Fact]
    public async Task DbContext_TabCascadeDelete_WhenUserDeleted()
    {
        await using var db = _fixture.CreateDbContext();
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email($"cascade-{Guid.NewGuid():N}@example.com"), "Cascade User", "$2b$12$fakehash");
        var tab = new Tab(Guid.NewGuid(), userId, "My Tab", 0);

        await db.Users.AddAsync(user);
        await db.Tabs.AddAsync(tab);
        await db.SaveChangesAsync();

        db.Users.Remove(user);
        await db.SaveChangesAsync();

        await using var readDb = _fixture.CreateDbContext();
        var tabExists = await readDb.Tabs.AnyAsync(t => t.UserId == userId);
        tabExists.Should().BeFalse("tab should be cascade-deleted with user");
    }

    [Fact]
    public async Task DbContext_NoteCascadeDelete_WhenTabDeleted()
    {
        await using var db = _fixture.CreateDbContext();
        var userId = Guid.NewGuid();
        var user = User.CreateLocal(userId, new Email($"notecascade-{Guid.NewGuid():N}@example.com"), "Note Cascade", "$2b$12$fakehash");
        var tab = new Tab(Guid.NewGuid(), userId, "Tab For Cascade", 0);
        var note = new Note(Guid.NewGuid(), userId, tab.Id, "Test Note", "Content", "en", DateTime.UtcNow);

        await db.Users.AddAsync(user);
        await db.Tabs.AddAsync(tab);
        await db.Notes.AddAsync(note);
        await db.SaveChangesAsync();

        db.Tabs.Remove(tab);
        await db.SaveChangesAsync();

        await using var readDb = _fixture.CreateDbContext();
        var noteExists = await readDb.Notes.AnyAsync(n => n.TabId == tab.Id);
        noteExists.Should().BeFalse("note should be cascade-deleted with tab");
    }

    [Fact]
    public async Task DbContext_OAuthUserHasNullPasswordHash()
    {
        await using var db = _fixture.CreateDbContext();
        var userId = Guid.NewGuid();
        var user = User.CreateOAuth(userId, new Email($"oauth-{Guid.NewGuid():N}@example.com"), "OAuth User", AuthProvider.Google, "google-id-123");

        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();

        await using var readDb = _fixture.CreateDbContext();
        var found = await readDb.Users.FirstOrDefaultAsync(u => u.Id == userId);
        found!.PasswordHash.Should().BeNull();
        found.Provider.Should().Be(AuthProvider.Google);
    }
}
