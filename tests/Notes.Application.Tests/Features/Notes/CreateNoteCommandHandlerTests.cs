using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Notes.Commands.CreateNote;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Notes;

public class CreateNoteCommandHandlerTests
{
    private readonly INoteRepository _noteRepo = Substitute.For<INoteRepository>();
    private readonly ITabRepository _tabRepo = Substitute.For<ITabRepository>();
    private readonly ITagRepository _tagRepo = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private CreateNoteCommandHandler CreateHandler() => new(_noteRepo, _tabRepo, _tagRepo, _uow);

    [Fact]
    public async Task Handle_ValidCommand_CreatesNoteAndReturnsId()
    {
        var userId = Guid.NewGuid();
        var tabId = Guid.NewGuid();
        var tab = new Tab(tabId, userId, "General", 0);
        _tabRepo.GetByIdAsync(tabId).Returns(tab);

        var cmd = new CreateNoteCommand(userId, tabId, "My Note", "Some content", "en");
        var result = await CreateHandler().Handle(cmd, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(Guid.Empty, result.Value);

        await _noteRepo.Received(1).AddAsync(
            Arg.Is<Note>(n => n.Title == "My Note" && n.UserId == userId && n.TabId == tabId),
            Arg.Any<CancellationToken>());

        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_TabNotFound_ReturnsFailResult()
    {
        _tabRepo.GetByIdAsync(Arg.Any<Guid>()).Returns((Tab?)null);

        var result = await CreateHandler().Handle(
            new CreateNoteCommand(Guid.NewGuid(), Guid.NewGuid(), "Title", "Content", "en"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);

        await _noteRepo.DidNotReceive().AddAsync(Arg.Any<Note>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_TabBelongsToOtherUser_ReturnsFailResult()
    {
        var tabId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var tab = new Tab(tabId, otherUserId, "General", 0); // different owner
        _tabRepo.GetByIdAsync(tabId).Returns(tab);

        var requestingUserId = Guid.NewGuid();
        var result = await CreateHandler().Handle(
            new CreateNoteCommand(requestingUserId, tabId, "Title", "Content", "en"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);

        await _noteRepo.DidNotReceive().AddAsync(Arg.Any<Note>(), Arg.Any<CancellationToken>());
    }
}
