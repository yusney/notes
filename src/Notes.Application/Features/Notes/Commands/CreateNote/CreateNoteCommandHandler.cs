using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Domain.Entities;

namespace Notes.Application.Features.Notes.Commands.CreateNote;

public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, Result<Guid>>
{
    private readonly INoteRepository _noteRepository;
    private readonly ITabRepository _tabRepository;
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateNoteCommandHandler(
        INoteRepository noteRepository,
        ITabRepository tabRepository,
        ITagRepository tagRepository,
        IUnitOfWork unitOfWork)
    {
        _noteRepository = noteRepository;
        _tabRepository = tabRepository;
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateNoteCommand request, CancellationToken cancellationToken)
    {
        var tab = await _tabRepository.GetByIdAsync(request.TabId, cancellationToken);
        if (tab is null || tab.UserId != request.UserId)
            return Result<Guid>.Fail("Tab not found.");

        var note = new Note(
            Guid.NewGuid(),
            request.UserId,
            request.TabId,
            request.Title,
            request.Content ?? string.Empty,
            request.Language ?? "en",
            DateTime.UtcNow);

        // Resolve tag names: find existing, create missing (create-on-assign)
        if (request.TagNames is { Count: > 0 })
        {
            var existing = await _tagRepository.GetByNamesAsync(
                request.UserId, request.TagNames, cancellationToken);

            var existingNames = existing.Select(t => t.Name.ToLower()).ToHashSet();

            foreach (var name in request.TagNames)
            {
                if (existingNames.Contains(name.ToLower()))
                {
                    var tag = existing.First(t => t.Name.ToLower() == name.ToLower());
                    note.AddTag(tag);
                }
                else
                {
                    var newTag = Tag.Create(request.UserId, name);
                    await _tagRepository.AddAsync(newTag, cancellationToken);
                    note.AddTag(newTag);
                }
            }
        }

        await _noteRepository.AddAsync(note, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Ok(note.Id);
    }
}
