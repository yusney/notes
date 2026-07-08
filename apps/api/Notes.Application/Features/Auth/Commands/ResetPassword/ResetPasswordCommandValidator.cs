using FluentValidation;

namespace Notes.Application.Features.Auth.Commands.ResetPassword;

public class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(c => c.Token)
            .NotEmpty().WithMessage("Token is required.");

        RuleFor(c => c.NewPassword)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .Matches(@"\d").WithMessage("Password must contain at least one number.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character.");
    }
}
