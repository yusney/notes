using Notes.Application.Features.Auth.Commands.Login;
using FluentValidation.TestHelper;

namespace Notes.Application.Tests.Features.Auth;

public class LoginCommandValidatorTests
{
    private readonly LoginCommandValidator _validator = new();

    [Fact]
    public void Validate_ValidCommand_PassesValidation()
    {
        var cmd = new LoginCommand("alice@example.com", "P@ssword1");
        var result = _validator.TestValidate(cmd);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_EmptyEmail_FailsValidation()
    {
        var cmd = new LoginCommand("", "P@ssword1");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Email);
    }

    [Fact]
    public void Validate_InvalidEmail_FailsValidation()
    {
        var cmd = new LoginCommand("not-valid", "P@ssword1");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Email);
    }

    [Fact]
    public void Validate_EmptyPassword_FailsValidation()
    {
        var cmd = new LoginCommand("alice@example.com", "");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Password);
    }
}
