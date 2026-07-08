using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence.Configurations;

internal sealed class PasswordResetTokenConfiguration : IEntityTypeConfiguration<PasswordResetToken>
{
    public void Configure(EntityTypeBuilder<PasswordResetToken> builder)
    {
        builder.ToTable("PasswordResetTokens");

        builder.HasKey(prt => prt.Id);

        builder.Property(prt => prt.Id)
            .ValueGeneratedNever();

        builder.Property(prt => prt.UserId)
            .IsRequired();

        builder.Property(prt => prt.TokenHash)
            .HasMaxLength(128)
            .IsRequired();

        builder.HasIndex(prt => prt.TokenHash)
            .IsUnique()
            .HasDatabaseName("IX_PasswordResetTokens_TokenHash");

        builder.HasIndex(prt => prt.UserId)
            .HasDatabaseName("IX_PasswordResetTokens_UserId");

        builder.Property(prt => prt.CreatedAt)
            .IsRequired();

        builder.Property(prt => prt.ExpiresAt)
            .IsRequired();

        builder.Property(prt => prt.IsUsed)
            .IsRequired();
    }
}
