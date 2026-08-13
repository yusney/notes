using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Domain.Entities;

namespace Notes.Application.Features.Notes.Commands.UpdateNote;

public class UpdateNoteCommandHandler : IRequestHandler<UpdateNoteCommand, Result>
{
    private readonly INoteRepository _noteRepository;
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateNoteCommandHandler(
        INoteRepository noteRepository,
        ITagRepository tagRepository,
        IUnitOfWork unitOfWork)
    {
        _noteRepository = noteRepository;
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(UpdateNoteCommand request, CancellationToken cancellationToken)
    {
        var note = await _noteRepository.GetByIdAsync(request.NoteId, cancellationToken);

        if (note is null || note.UserId != request.UserId)
            return Result.Fail("Note not found.");

        note.Update(request.Title, request.Content);

        // null = no change; empty list = clear all tags
        if (request.TagNames is not null)
        {
            note.ClearTags();

            if (request.TagNames.Count > 0)
            {
                var existing = await _tagRepository.GetByNamesAsync(
                    request.UserId, request.TagNames, cancellationToken);

                var existingNames = existing.Select(t => t.Name.ToLower()).ToHashSet();

                foreach (var name in request.TagNames)
                {
                    if (existingNames.Contains(name.ToLower()))
                    {
                        note.AddTag(existing.First(t => t.Name.ToLower() == name.ToLower()));
                    }
                    else
                    {
                        var newTag = Tag.Create(request.UserId, name);
                        await _tagRepository.AddAsync(newTag, cancellationToken);
                        note.AddTag(newTag);
                    }
                }
            }
        }

        await _noteRepository.UpdateAsync(note, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }
}
