using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NpgsqlTypes;
using Notes.Domain.Entities;

namespace Notes.Infrastructure.Persistence.Configurations;

internal sealed class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    private readonly bool _isRelational;

    public NoteConfiguration(bool isRelational = true)
    {
        _isRelational = isRelational;
    }

    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.ToTable("Notes");

        builder.HasKey(n => n.Id);

        builder.Property(n => n.Id)
            .ValueGeneratedNever();

        builder.Property(n => n.UserId)
            .IsRequired();

        builder.Property(n => n.TabId)
            .IsRequired();

        builder.Property(n => n.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(n => n.Content)
            .IsRequired(false);

        builder.Property(n => n.Language)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(n => n.CreatedAt)
            .IsRequired();

        builder.Property(n => n.UpdatedAt);

        builder.Property(n => n.IsFavorite)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(n => n.FavoritedAt);

        builder.HasIndex(n => new { n.UserId, n.IsFavorite })
            .HasDatabaseName("IX_Notes_UserId_IsFavorite");

        if (_isRelational)
        {
            // FTS: computed tsvector column (English by default)
            builder.Property<NpgsqlTsVector>("SearchVector")
                .HasColumnType("tsvector")
                .HasComputedColumnSql(
                    "to_tsvector('english', coalesce(\"Title\", '') || ' ' || coalesce(\"Content\", ''))",
                    stored: true);

            // GIN index on the tsvector column for fast FTS
            builder.HasIndex("SearchVector")
                .HasDatabaseName("IX_Notes_SearchVector")
                .HasMethod("GIN");
        }

        builder.HasIndex(n => n.UserId)
            .HasDatabaseName("IX_Notes_UserId");

        builder.HasIndex(n => n.TabId)
            .HasDatabaseName("IX_Notes_TabId");

        builder.HasOne<Tab>()
            .WithMany()
            .HasForeignKey(n => n.TabId)
            .OnDelete(DeleteBehavior.Cascade);

        // Many-to-many: Note <-> Tag via explicit NoteTags join table
        builder.HasMany(n => n.Tags)
            .WithMany()
            .UsingEntity(
                "NoteTags",
                l => l.HasOne(typeof(Tag)).WithMany().HasForeignKey("TagId")
                    .OnDelete(DeleteBehavior.Cascade),
                r => r.HasOne(typeof(Note)).WithMany().HasForeignKey("NoteId")
                    .OnDelete(DeleteBehavior.Cascade));
    }
}
