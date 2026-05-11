using Notes.Application.Features.Notes.Commands.CreateNote;
using FluentValidation.TestHelper;

namespace Notes.Application.Tests.Features.Notes;

public class CreateNoteCommandValidatorTests
{
    private readonly CreateNoteCommandValidator _validator = new();

    [Fact]
    public void Validate_ValidCommand_PassesValidation()
    {
        var cmd = new CreateNoteCommand(Guid.NewGuid(), Guid.NewGuid(), "Hello World", "Content here", "en");
        var result = _validator.TestValidate(cmd);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_EmptyTitle_FailsValidation()
    {
        var cmd = new CreateNoteCommand(Guid.NewGuid(), Guid.NewGuid(), "", "Content", "en");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Title);
    }

    [Fact]
    public void Validate_TitleExactly200Chars_PassesValidation()
    {
        var cmd = new CreateNoteCommand(Guid.NewGuid(), Guid.NewGuid(), new string('A', 200), "Content", "en");
        var result = _validator.TestValidate(cmd);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_TitleExceeds200Chars_FailsValidation()
    {
        var cmd = new CreateNoteCommand(Guid.NewGuid(), Guid.NewGuid(), new string('A', 201), "Content", "en");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Title);
    }

    [Fact]
    public void Validate_ContentExceeds100KB_FailsValidation()
    {
        var bigContent = new string('x', 102_401); // > 100KB chars
        var cmd = new CreateNoteCommand(Guid.NewGuid(), Guid.NewGuid(), "Title", bigContent, "en");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.Content);
    }

    [Fact]
    public void Validate_EmptyUserId_FailsValidation()
    {
        var cmd = new CreateNoteCommand(Guid.Empty, Guid.NewGuid(), "Title", "Content", "en");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.UserId);
    }

    [Fact]
    public void Validate_EmptyTabId_FailsValidation()
    {
        var cmd = new CreateNoteCommand(Guid.NewGuid(), Guid.Empty, "Title", "Content", "en");
        var result = _validator.TestValidate(cmd);
        result.ShouldHaveValidationErrorFor(c => c.TabId);
    }
}
