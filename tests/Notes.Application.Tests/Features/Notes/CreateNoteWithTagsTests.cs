using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Notes.Commands.CreateNote;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Notes;

public class CreateNoteWithTagsTests
{
    private readonly INoteRepository _noteRepo = Substitute.For<INoteRepository>();
    private readonly ITabRepository _tabRepo = Substitute.For<ITabRepository>();
    private readonly ITagRepository _tagRepo = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private CreateNoteCommandHandler CreateHandler() => new(_noteRepo, _tabRepo, _tagRepo, _uow);

    [Fact]
    public async Task Handle_WithTagNames_ResolvesAndAssignsTags()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var tab = new Tab(tabId, userId, "General", 0);
        var existingTag = Tag.Create(userId, "work");

        _tabRepo.GetByIdAsync(tabId, Arg.Any<CancellationToken>()).Returns(tab);
        _tagRepo.GetByNamesAsync(userId, Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { existingTag });

        var cmd = new CreateNoteCommand(userId, tabId, "My Note", "Content", "en",
            new List<string> { "work" });
        var result = await CreateHandler().Handle(cmd, CancellationToken.None);

        Assert.True(result.IsSuccess);
        await _noteRepo.Received(1).AddAsync(
            Arg.Is<Note>(n => n.Tags.Any(t => t.Name == "work")),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithNewTagName_CreatesTagAndAssigns()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var tab = new Tab(tabId, userId, "General", 0);

        _tabRepo.GetByIdAsync(tabId, Arg.Any<CancellationToken>()).Returns(tab);
        // No existing tags found
        _tagRepo.GetByNamesAsync(userId, Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var cmd = new CreateNoteCommand(userId, tabId, "My Note", "Content", "en",
            new List<string> { "newtag" });
        var result = await CreateHandler().Handle(cmd, CancellationToken.None);

        Assert.True(result.IsSuccess);
        // New tag should be added to repo
        await _tagRepo.Received(1).AddAsync(
            Arg.Is<Tag>(t => t.Name == "newtag" && t.UserId == userId),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithNoTagNames_CreatesNoteWithoutTags()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var tab = new Tab(tabId, userId, "General", 0);
        _tabRepo.GetByIdAsync(tabId, Arg.Any<CancellationToken>()).Returns(tab);

        var cmd = new CreateNoteCommand(userId, tabId, "My Note", "Content", "en");
        var result = await CreateHandler().Handle(cmd, CancellationToken.None);

        Assert.True(result.IsSuccess);
        await _noteRepo.Received(1).AddAsync(
            Arg.Is<Note>(n => n.Tags.Count == 0),
            Arg.Any<CancellationToken>());
    }
}
