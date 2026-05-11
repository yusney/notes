using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Notes.Commands.UpdateNote;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Notes;

public class UpdateNoteWithTagsTests
{
    private readonly INoteRepository _noteRepo = Substitute.For<INoteRepository>();
    private readonly ITagRepository _tagRepo = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private UpdateNoteCommandHandler CreateHandler() => new(_noteRepo, _tagRepo, _uow);

    private static Note MakeNote(Guid userId, Guid tabId) =>
        new Note(Guid.NewGuid(), userId, tabId, "Original", "Content", "en", DateTime.UtcNow);

    [Fact]
    public async Task Handle_WithTagNames_ClearsAndReplacesTags()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var note = MakeNote(userId, tabId);
        var oldTag = Tag.Create(userId, "old");
        note.AddTag(oldTag);

        var newTag = Tag.Create(userId, "new");
        _noteRepo.GetByIdAsync(note.Id, Arg.Any<CancellationToken>()).Returns(note);
        _tagRepo.GetByNamesAsync(userId, Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { newTag });

        var result = await CreateHandler().Handle(
            new UpdateNoteCommand(note.Id, userId, "Updated", "Content", new List<string> { "new" }),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.DoesNotContain(note.Tags, t => t.Name == "old");
        Assert.Contains(note.Tags, t => t.Name == "new");
    }

    [Fact]
    public async Task Handle_NullTagNames_DoesNotChangeTags()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var note = MakeNote(userId, tabId);
        var tag = Tag.Create(userId, "existing");
        note.AddTag(tag);

        _noteRepo.GetByIdAsync(note.Id, Arg.Any<CancellationToken>()).Returns(note);

        var result = await CreateHandler().Handle(
            new UpdateNoteCommand(note.Id, userId, "Updated", "Content", null),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        // Tags should be unchanged since TagNames is null
        Assert.Single(note.Tags);
    }

    [Fact]
    public async Task Handle_EmptyTagNames_ClearsTags()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var note = MakeNote(userId, tabId);
        note.AddTag(Tag.Create(userId, "work"));
        _noteRepo.GetByIdAsync(note.Id, Arg.Any<CancellationToken>()).Returns(note);
        _tagRepo.GetByNamesAsync(userId, Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var result = await CreateHandler().Handle(
            new UpdateNoteCommand(note.Id, userId, "Updated", "Content", new List<string>()),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(note.Tags);
    }
}
