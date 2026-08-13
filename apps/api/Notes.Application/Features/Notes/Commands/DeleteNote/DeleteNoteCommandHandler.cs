using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Commands.DeleteNote;

public class DeleteNoteCommandHandler : IRequestHandler<DeleteNoteCommand, Result>
{
    private readonly INoteRepository _noteRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteNoteCommandHandler(INoteRepository noteRepository, IUnitOfWork unitOfWork)
    {
        _noteRepository = noteRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteNoteCommand request, CancellationToken cancellationToken)
    {
        var note = await _noteRepository.GetByIdAsync(request.NoteId, cancellationToken);

        if (note is null || note.UserId != request.UserId)
            return Result.Fail("Note not found.");

        await _noteRepository.DeleteAsync(request.NoteId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }
}
