using Notes.Application.Features.Tabs.Commands.CreateTab;
using FluentValidation.TestHelper;

namespace Notes.Application.Tests.Features.Tabs;

public class CreateTabCommandValidatorTests
{
    private readonly CreateTabCommandValidator _validator = new();

    [Fact]
    public void Validate_ValidCommand_PassesValidation()
    {
        var cmd = new CreateTabCommand(Guid.NewGuid(), "My Notes");
        var result = _validator.TestValidate(cmd);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_EmptyName_FailsValidation()
    {
        var cmd = new CreateTabCommand(Guid.NewGuid(), "");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Name);
    }

    [Fact]
    public void Validate_NameExactly50Chars_PassesValidation()
    {
        var cmd = new CreateTabCommand(Guid.NewGuid(), new string('A', 50));
        var result = _validator.TestValidate(cmd);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_NameExceeds50Chars_FailsValidation()
    {
        var cmd = new CreateTabCommand(Guid.NewGuid(), new string('A', 51));
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Name);
    }

    [Fact]
    public void Validate_EmptyUserId_FailsValidation()
    {
        var cmd = new CreateTabCommand(Guid.Empty, "My Notes");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.UserId);
    }
}
