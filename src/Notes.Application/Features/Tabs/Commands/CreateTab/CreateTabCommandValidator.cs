using FluentValidation;

namespace Notes.Application.Features.Tabs.Commands.CreateTab;

public class CreateTabCommandValidator : AbstractValidator<CreateTabCommand>
{
    public CreateTabCommandValidator()
    {
        RuleFor(c => c.UserId)
            .NotEmpty().WithMessage("UserId is required.");

        RuleFor(c => c.Name)
            .NotEmpty().WithMessage("Tab name is required.")
            .MaximumLength(50).WithMessage("Tab name cannot exceed 50 characters.");
    }
}
