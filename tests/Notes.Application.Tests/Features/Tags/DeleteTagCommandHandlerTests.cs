using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Tags.Commands.DeleteTag;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Tags;

public class DeleteTagCommandHandlerTests
{
    private readonly ITagRepository _tagRepo = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private DeleteTagCommandHandler CreateHandler() => new(_tagRepo, _uow);

    [Fact]
    public async Task Handle_ExistingTag_DeletesTag()
    {
        var userId = Guid.NewGuid();
        var tag = Tag.Create(userId, "work");
        _tagRepo.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);

        var result = await CreateHandler().Handle(
            new DeleteTagCommand(tag.Id, userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        await _tagRepo.Received(1).DeleteAsync(tag.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_TagNotFound_ReturnsFailResult()
    {
        _tagRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Tag?)null);

        var result = await CreateHandler().Handle(
            new DeleteTagCommand(Guid.NewGuid(), Guid.NewGuid()), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Handle_TagBelongsToOtherUser_ReturnsFailResult()
    {
        var tag = Tag.Create(Guid.NewGuid(), "work");
        _tagRepo.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);

        var differentUserId = Guid.NewGuid();
        var result = await CreateHandler().Handle(
            new DeleteTagCommand(tag.Id, differentUserId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        await _tagRepo.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }
}
