using Notes.Application.Features.Auth.Commands.RegisterUser;
using FluentValidation.TestHelper;

namespace Notes.Application.Tests.Features.Auth;

public class RegisterUserCommandValidatorTests
{
    private readonly RegisterUserCommandValidator _validator = new();

    // ── Email validation ──────────────────────────────────────────────────────

    [Fact]
    public void Validate_ValidCommand_PassesValidation()
    {
        var cmd = new RegisterUserCommand("alice@example.com", "P@ssword1", "Alice");
        var result = _validator.TestValidate(cmd);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_EmptyEmail_FailsValidation()
    {
        var cmd = new RegisterUserCommand("", "P@ssword1", "Alice");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Email);
    }

    [Fact]
    public void Validate_InvalidEmailFormat_FailsValidation()
    {
        var cmd = new RegisterUserCommand("not-an-email", "P@ssword1", "Alice");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Email);
    }

    // ── Password validation ───────────────────────────────────────────────────

    [Fact]
    public void Validate_PasswordTooShort_FailsValidation()
    {
        var cmd = new RegisterUserCommand("alice@example.com", "Abc1!", "Alice");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Password);
    }

    [Fact]
    public void Validate_PasswordMissingNumber_FailsValidation()
    {
        var cmd = new RegisterUserCommand("alice@example.com", "Password!", "Alice");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Password);
    }

    [Fact]
    public void Validate_PasswordMissingSpecialChar_FailsValidation()
    {
        var cmd = new RegisterUserCommand("alice@example.com", "Password1", "Alice");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Password);
    }

    [Fact]
    public void Validate_PasswordExactly8CharsWithNumberAndSpecial_PassesValidation()
    {
        var cmd = new RegisterUserCommand("alice@example.com", "Abc1!xyz", "Alice");
        var result = _validator.TestValidate(cmd);
        result.ShouldNotHaveValidationErrorFor(c => c.Password);
    }

    // ── DisplayName validation ────────────────────────────────────────────────

    [Fact]
    public void Validate_EmptyDisplayName_FailsValidation()
    {
        var cmd = new RegisterUserCommand("alice@example.com", "P@ssword1", "");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.DisplayName);
    }

    [Fact]
    public void Validate_DisplayNameTooLong_FailsValidation()
    {
        var cmd = new RegisterUserCommand("alice@example.com", "P@ssword1", new string('A', 101));
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.DisplayName);
    }
}
