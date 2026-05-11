using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Tags.Commands.UpdateTag;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Tags;

public class UpdateTagCommandHandlerTests
{
    private readonly ITagRepository _tagRepo = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private UpdateTagCommandHandler CreateHandler() => new(_tagRepo, _uow);

    [Fact]
    public async Task Handle_ValidRename_UpdatesTag()
    {
        var userId = Guid.NewGuid();
        var tag = Tag.Create(userId, "old");
        _tagRepo.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _tagRepo.GetByNamesAsync(userId, Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var result = await CreateHandler().Handle(
            new UpdateTagCommand(tag.Id, userId, "new"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("new", tag.Name);
        await _tagRepo.Received(1).UpdateAsync(tag, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DuplicateName_ReturnsFailResult()
    {
        var userId = Guid.NewGuid();
        var tag = Tag.Create(userId, "old");
        var existing = Tag.Create(userId, "new");
        _tagRepo.GetByIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _tagRepo.GetByNamesAsync(userId, Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { existing });

        var result = await CreateHandler().Handle(
            new UpdateTagCommand(tag.Id, userId, "new"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("already exists", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Handle_TagNotFound_ReturnsFailResult()
    {
        _tagRepo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Tag?)null);

        var result = await CreateHandler().Handle(
            new UpdateTagCommand(Guid.NewGuid(), Guid.NewGuid(), "new"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Errors[0], StringComparison.OrdinalIgnoreCase);
    }
}
