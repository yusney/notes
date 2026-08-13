using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence.Configurations;

internal sealed class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.ToTable("Tags");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Id)
            .ValueGeneratedNever();

        builder.Property(t => t.UserId)
            .IsRequired();

        builder.Property(t => t.Name)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(t => t.CreatedAt)
            .IsRequired();

        // Unique index: one tag name per user
        builder.HasIndex(t => new { t.UserId, t.Name })
            .IsUnique()
            .HasDatabaseName("IX_Tags_UserId_Name");

        builder.HasIndex(t => t.UserId)
            .HasDatabaseName("IX_Tags_UserId");
    }
}
