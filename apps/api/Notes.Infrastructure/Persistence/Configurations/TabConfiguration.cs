using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence.Configurations;

internal sealed class TabConfiguration : IEntityTypeConfiguration<Tab>
{
    public void Configure(EntityTypeBuilder<Tab> builder)
    {
        builder.ToTable("Tabs");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Id)
            .ValueGeneratedNever();

        builder.Property(t => t.UserId)
            .IsRequired();

        builder.Property(t => t.Name)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(t => t.Order)
            .IsRequired();

        builder.HasIndex(t => new { t.UserId, t.Name })
            .IsUnique()
            .HasDatabaseName("IX_Tabs_UserId_Name");

        builder.HasIndex(t => t.UserId)
            .HasDatabaseName("IX_Tabs_UserId");
    }
}
