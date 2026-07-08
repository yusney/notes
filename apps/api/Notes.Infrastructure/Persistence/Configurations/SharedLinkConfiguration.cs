using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence.Configurations;

internal sealed class SharedLinkConfiguration : IEntityTypeConfiguration<SharedLink>
{
    public void Configure(EntityTypeBuilder<SharedLink> builder)
    {
        builder.ToTable("SharedLinks");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id)
            .ValueGeneratedNever();

        builder.Property(s => s.NoteId)
            .IsRequired();

        builder.Property(s => s.UserId)
            .IsRequired();

        builder.Property(s => s.Token)
            .HasMaxLength(21)
            .IsRequired();

        builder.Property(s => s.CreatedAt)
            .IsRequired();

        builder.Property(s => s.ExpiresAt);
        builder.Property(s => s.RevokedAt);
        builder.Property(s => s.AccessCount)
            .IsRequired()
            .HasDefaultValue(0);

        // Unique constraint on Token — enforces no collision at DB level
        builder.HasIndex(s => s.Token)
            .IsUnique()
            .HasDatabaseName("UX_SharedLinks_Token");

        builder.HasIndex(s => s.NoteId)
            .HasDatabaseName("IX_SharedLinks_NoteId");

        // FK to Note — cascade delete removes all links when note is deleted
        builder.HasOne<Note>()
            .WithMany()
            .HasForeignKey(s => s.NoteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
