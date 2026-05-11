using FluentValidation;

namespace Notes.Application.Features.Users.Commands.ChangePassword;

public class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        RuleFor(c => c.CurrentPassword)
            .NotEmpty().WithMessage("Current password is required.");

        RuleFor(c => c.NewPassword)
            .NotEmpty().WithMessage("New password is required.")
            .MinimumLength(8).WithMessage("New password must be at least 8 characters.")
            .Matches(@"\d").WithMessage("New password must contain at least one number.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("New password must contain at least one special character.");
    }
}
