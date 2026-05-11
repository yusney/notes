using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Tags.Commands.CreateTag;
using Notes.Domain.Entities;
using NSubstitute;

namespace Notes.Application.Tests.Features.Tags;

public class CreateTagCommandHandlerTests
{
    private readonly ITagRepository _tagRepo = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();

    private CreateTagCommandHandler CreateHandler() => new(_tagRepo, _uow);

    [Fact]
    public async Task Handle_ValidName_NoExisting_CreatesTag()
    {
        var userId = Guid.NewGuid();
        _tagRepo.GetByNamesAsync(userId, Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var cmd = new CreateTagCommand(userId, "work");
        var result = await CreateHandler().Handle(cmd, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(Guid.Empty, result.Value);

        await _tagRepo.Received(1).AddAsync(
            Arg.Is<Tag>(t => t.Name == "work" && t.UserId == userId),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DuplicateName_ReturnsFailResult()
    {
        var userId = Guid.NewGuid();
        var existing = Tag.Create(userId, "work");
        _tagRepo.GetByNamesAsync(userId, Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { existing });

        var result = await CreateHandler().Handle(new CreateTagCommand(userId, "work"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("already exists", result.Errors[0], StringComparison.OrdinalIgnoreCase);
        await _tagRepo.DidNotReceive().AddAsync(Arg.Any<Tag>(), Arg.Any<CancellationToken>());
    }
}
