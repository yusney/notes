using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Domain.Entities;

namespace Notes.Application.Features.Tags.Commands.CreateTag;

public class CreateTagCommandHandler : IRequestHandler<CreateTagCommand, Result<Guid>>
{
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateTagCommandHandler(ITagRepository tagRepository, IUnitOfWork unitOfWork)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateTagCommand request, CancellationToken cancellationToken)
    {
        var existing = await _tagRepository.GetByNamesAsync(
            request.UserId, new[] { request.Name }, cancellationToken);

        if (existing.Count > 0)
            return Result<Guid>.Fail($"Tag '{request.Name}' already exists.");

        var tag = Tag.Create(request.UserId, request.Name);
        await _tagRepository.AddAsync(tag, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Ok(tag.Id);
    }
}
