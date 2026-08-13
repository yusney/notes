using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.SharedLinks.Dtos;
using Notes.Domain.Entities;

namespace Notes.Application.Features.SharedLinks.Commands.CreateSharedLink;

public class CreateSharedLinkCommandHandler : IRequestHandler<CreateSharedLinkCommand, Result<SharedLinkDto>>
{
    private readonly ISharedLinkRepository _sharedLinkRepo;
    private readonly INoteRepository _noteRepo;
    private readonly IUnitOfWork _unitOfWork;

    public CreateSharedLinkCommandHandler(
        ISharedLinkRepository sharedLinkRepo,
        INoteRepository noteRepo,
        IUnitOfWork unitOfWork)
    {
        _sharedLinkRepo = sharedLinkRepo;
        _noteRepo = noteRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<SharedLinkDto>> Handle(
        CreateSharedLinkCommand request, CancellationToken cancellationToken)
    {
        var note = await _noteRepo.GetByIdAsync(request.NoteId, cancellationToken);
        if (note is null || note.UserId != request.UserId)
            return Result<SharedLinkDto>.Fail("Note not found.");

        var link = SharedLink.Create(request.NoteId, request.UserId, request.ExpiresAt);

        await _sharedLinkRepo.AddAsync(link, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<SharedLinkDto>.Ok(
            new SharedLinkDto(
                link.Id,
                link.Token,
                link.NoteId,
                link.CreatedAt,
                link.ExpiresAt,
                link.IsActive(DateTime.UtcNow)));
    }
}
