namespace Notes.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendWelcomeEmailAsync(string to, string displayName, CancellationToken ct = default);
    Task SendPasswordResetEmailAsync(string to, string resetLink, CancellationToken ct = default);
}
