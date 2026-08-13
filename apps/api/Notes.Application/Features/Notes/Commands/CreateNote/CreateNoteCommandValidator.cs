using FluentValidation;

namespace Notes.Application.Features.Notes.Commands.CreateNote;

public class CreateNoteCommandValidator : AbstractValidator<CreateNoteCommand>
{
    private const int MaxContentLength = 102_400; // 100 KB (char approximation)

    public CreateNoteCommandValidator()
    {
        RuleFor(c => c.UserId)
            .NotEmpty().WithMessage("UserId is required.");

        RuleFor(c => c.TabId)
            .NotEmpty().WithMessage("TabId is required.");

        RuleFor(c => c.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MaximumLength(200).WithMessage("Title cannot exceed 200 characters.");

        RuleFor(c => c.Content)
            .Must(c => c is null || c.Length <= MaxContentLength)
            .WithMessage("Content cannot exceed 100 KB.");
    }
}
