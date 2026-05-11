using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Commands.ToggleFavorite;

public class ToggleFavoriteCommandHandler : IRequestHandler<ToggleFavoriteCommand, Result<NoteFavoriteDto>>
{
    private readonly INoteRepository _noteRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ToggleFavoriteCommandHandler(INoteRepository noteRepository, IUnitOfWork unitOfWork)
    {
        _noteRepository = noteRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<NoteFavoriteDto>> Handle(
        ToggleFavoriteCommand request, CancellationToken cancellationToken)
    {
        var note = await _noteRepository.GetByIdAsync(request.NoteId, cancellationToken);
        if (note is null || note.UserId != request.UserId)
            return Result<NoteFavoriteDto>.Fail("Note not found.");

        note.ToggleFavorite();
        await _noteRepository.UpdateAsync(note, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<NoteFavoriteDto>.Ok(new NoteFavoriteDto(note.Id, note.IsFavorite, note.FavoritedAt));
    }
}
