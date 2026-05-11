using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Tags.Commands.UpdateTag;

public class UpdateTagCommandHandler : IRequestHandler<UpdateTagCommand, Result>
{
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateTagCommandHandler(ITagRepository tagRepository, IUnitOfWork unitOfWork)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(UpdateTagCommand request, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdAsync(request.TagId, cancellationToken);
        if (tag is null || tag.UserId != request.UserId)
            return Result.Fail("Tag not found.");

        var existing = await _tagRepository.GetByNamesAsync(
            request.UserId, new[] { request.NewName }, cancellationToken);

        if (existing.Any(t => t.Id != request.TagId))
            return Result.Fail($"Tag '{request.NewName}' already exists.");

        tag.Rename(request.NewName);
        await _tagRepository.UpdateAsync(tag, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }
}
