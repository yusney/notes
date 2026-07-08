using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Notes.Application.Common.Interfaces;
using Notes.Domain.Entities;
using Notes.Infrastructure.Persistence.Configurations;

namespace Notes.Infrastructure.Persistence;

public sealed class ApplicationDbContext : DbContext, IUnitOfWork
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Tab> Tabs => Set<Tab>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<UserPreferences> UserPreferences => Set<UserPreferences>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<SharedLink> SharedLinks => Set<SharedLink>();

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfiguration(new UserConfiguration());
        modelBuilder.ApplyConfiguration(new TabConfiguration());
        modelBuilder.ApplyConfiguration(
            new NoteConfiguration(isRelational: Database.IsRelational()));
        modelBuilder.ApplyConfiguration(new TagConfiguration());
        modelBuilder.ApplyConfiguration(new UserPreferencesConfiguration());
        modelBuilder.ApplyConfiguration(new RefreshTokenConfiguration());
        modelBuilder.ApplyConfiguration(new PasswordResetTokenConfiguration());
        modelBuilder.ApplyConfiguration(new SharedLinkConfiguration());
    }

    public new Task<int> SaveChangesAsync(CancellationToken ct = default)
        => base.SaveChangesAsync(ct);
}
