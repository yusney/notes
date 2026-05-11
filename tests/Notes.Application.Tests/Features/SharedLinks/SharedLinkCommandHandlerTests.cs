using Notes.Application.Common.Interfaces;
using Notes.Application.Features.SharedLinks.Commands.CreateSharedLink;
using Notes.Application.Features.SharedLinks.Commands.RevokeSharedLink;
using Notes.Application.Features.SharedLinks.Queries.GetSharedLinks;
using Notes.Application.Features.SharedLinks.Queries.GetSharedNoteByToken;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.SharedLinks;

public class SharedLinkCommandHandlerTests
{
    private readonly ISharedLinkRepository _repo = Substitute.For<ISharedLinkRepository>();
    private readonly INoteRepository _noteRepo = Substitute.For<INoteRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    // ── CreateSharedLink ─────────────────────────────────────────────────────

    [Fact]
    public async Task CreateSharedLink_ValidCommand_ReturnsSharedLinkDto()
    {
        var userId = Guid.NewGuid();
        var noteId = Guid.NewGuid();
        var note = new Note(noteId, userId, Guid.NewGuid(), "Title", "Content", "en", DateTime.UtcNow);
        _noteRepo.GetByIdAsync(noteId).Returns(note);

        var handler = new CreateSharedLinkCommandHandler(_repo, _noteRepo, _uow);
        var cmd = new CreateSharedLinkCommand(noteId, userId, null);

        var result = await handler.Handle(cmd, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(21, result.Value.Token.Length);
        await _repo.Received(1).AddAsync(Arg.Any<SharedLink>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateSharedLink_NoteNotFound_ReturnsFailResult()
    {
        _noteRepo.GetByIdAsync(Arg.Any<Guid>()).Returns((Note?)null);

        var handler = new CreateSharedLinkCommandHandler(_repo, _noteRepo, _uow);
        var cmd = new CreateSharedLinkCommand(Guid.NewGuid(), Guid.NewGuid(), null);

        var result = await handler.Handle(cmd, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateSharedLink_NoteOwnerMismatch_ReturnsFailResult()
    {
        var noteId = Guid.NewGuid();
        var noteOwnerId = Guid.NewGuid();
        var note = new Note(noteId, noteOwnerId, Guid.NewGuid(), "Title", "Content", "en", DateTime.UtcNow);
        _noteRepo.GetByIdAsync(noteId).Returns(note);

        var requestingUserId = Guid.NewGuid();
        var handler = new CreateSharedLinkCommandHandler(_repo, _noteRepo, _uow);
        var cmd = new CreateSharedLinkCommand(noteId, requestingUserId, null);

        var result = await handler.Handle(cmd, CancellationToken.None);

        Assert.False(result.IsSuccess);
        await _repo.DidNotReceive().AddAsync(Arg.Any<SharedLink>(), Arg.Any<CancellationToken>());
    }

    // ── RevokeSharedLink ─────────────────────────────────────────────────────

    [Fact]
    public async Task RevokeSharedLink_ExistingLink_CallsRevokeAsync()
    {
        var userId = Guid.NewGuid();
        var link = SharedLink.Create(Guid.NewGuid(), userId);
        _repo.GetByTokenAsync(link.Token).Returns(link);

        var handler = new RevokeSharedLinkCommandHandler(_repo, _uow);
        var cmd = new RevokeSharedLinkCommand(link.Token, userId);

        var result = await handler.Handle(cmd, CancellationToken.None);

        Assert.True(result.IsSuccess);
        await _repo.Received(1).RevokeAsync(link.Id, Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RevokeSharedLink_TokenNotFound_ReturnsFailResult()
    {
        _repo.GetByTokenAsync(Arg.Any<string>()).Returns((SharedLink?)null);

        var handler = new RevokeSharedLinkCommandHandler(_repo, _uow);
        var cmd = new RevokeSharedLinkCommand("nonexistent-token", Guid.NewGuid());

        var result = await handler.Handle(cmd, CancellationToken.None);

        Assert.False(result.IsSuccess);
        await _repo.DidNotReceive().RevokeAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    // ── GetSharedNoteByToken ─────────────────────────────────────────────────

    [Fact]
    public async Task GetSharedNoteByToken_ValidToken_ReturnsSharedNoteDto()
    {
        var noteId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var link = SharedLink.Create(noteId, userId);
        var note = new Note(noteId, userId, Guid.NewGuid(), "My Title", "My Content", "en", DateTime.UtcNow);

        _repo.GetByTokenAsync(link.Token).Returns(link);
        _noteRepo.GetByIdAsync(noteId).Returns(note);

        var handler = new GetSharedNoteByTokenQueryHandler(_repo, _noteRepo);
        var query = new GetSharedNoteByTokenQuery(link.Token);

        var result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("My Title", result.Value.Title);
        Assert.Equal("My Content", result.Value.Content);
    }

    [Fact]
    public async Task GetSharedNoteByToken_RevokedToken_ReturnsFailResult()
    {
        var link = SharedLink.Create(Guid.NewGuid(), Guid.NewGuid());
        link.Revoke();
        _repo.GetByTokenAsync(link.Token).Returns(link);

        var handler = new GetSharedNoteByTokenQueryHandler(_repo, _noteRepo);
        var result = await handler.Handle(new GetSharedNoteByTokenQuery(link.Token), CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task GetSharedNoteByToken_ExpiredToken_ReturnsFailResult()
    {
        // Token expired yesterday
        var link = SharedLink.Create(Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow.AddDays(-1));
        _repo.GetByTokenAsync(link.Token).Returns(link);

        var handler = new GetSharedNoteByTokenQueryHandler(_repo, _noteRepo);
        var result = await handler.Handle(new GetSharedNoteByTokenQuery(link.Token), CancellationToken.None);

        Assert.False(result.IsSuccess);
        await _noteRepo.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    // ── GetSharedLinks ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSharedLinks_ReturnsLinksForUser()
    {
        var userId = Guid.NewGuid();
        var noteId = Guid.NewGuid();
        var links = new List<SharedLink>
        {
            SharedLink.Create(noteId, userId),
            SharedLink.Create(noteId, userId)
        };
        _repo.GetByUserIdAsync(userId).Returns(links);

        var handler = new GetSharedLinksQueryHandler(_repo);
        var result = await handler.Handle(new GetSharedLinksQuery(userId, null), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count);
    }
}
