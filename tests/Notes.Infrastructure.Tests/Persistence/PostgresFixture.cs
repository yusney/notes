using Microsoft.EntityFrameworkCore;
using Notes.Infrastructure.Persistence;
using Testcontainers.PostgreSql;

namespace Notes.Infrastructure.Tests.Persistence;

/// <summary>
/// Shared Testcontainers PostgreSQL fixture — one container per test collection.
/// Runs full EF migrations to get a real schema including tsvector/GIN index.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("notes_test")
        .WithUsername("test_user")
        .WithPassword("test_pass")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;

        return new ApplicationDbContext(options);
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        // Apply all migrations (creates schema + tsvector computed column + GIN index)
        await using var db = CreateDbContext();
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
        => await _container.DisposeAsync();
}

[CollectionDefinition("Postgres")]
public class PostgresCollection : ICollectionFixture<PostgresFixture> { }
