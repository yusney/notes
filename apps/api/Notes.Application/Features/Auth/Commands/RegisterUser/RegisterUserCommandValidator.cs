using FluentValidation;

namespace Notes.Application.Features.Auth.Commands.RegisterUser;

public class RegisterUserCommandValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserCommandValidator()
    {
        RuleFor(c => c.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Email is not valid.");

        RuleFor(c => c.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .Matches(@"\d").WithMessage("Password must contain at least one number.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character.");

        RuleFor(c => c.DisplayName)
            .NotEmpty().WithMessage("Display name is required.")
            .MaximumLength(100).WithMessage("Display name cannot exceed 100 characters.");
    }
}
