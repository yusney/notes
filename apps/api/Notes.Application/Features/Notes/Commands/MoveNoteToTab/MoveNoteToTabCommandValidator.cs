using FluentValidation;

namespace Notes.Application.Features.Notes.Commands.MoveNoteToTab;

public class MoveNoteToTabCommandValidator : AbstractValidator<MoveNoteToTabCommand>
{
    public MoveNoteToTabCommandValidator()
    {
        RuleFor(c => c.UserId)
            .NotEmpty().WithMessage("UserId is required.");

        RuleFor(c => c.NoteId)
            .NotEmpty().WithMessage("NoteId is required.");

        RuleFor(c => c.TabId)
            .NotEmpty().WithMessage("TabId is required.");
    }
}