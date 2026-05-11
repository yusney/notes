using FluentValidation;

namespace Notes.Application.Features.Users.Commands.UpdatePreferences;

public class UpdatePreferencesCommandValidator : AbstractValidator<UpdatePreferencesCommand>
{
    public UpdatePreferencesCommandValidator()
    {
        RuleFor(c => c.UserId).NotEmpty().WithMessage("UserId is required.");
    }
}
