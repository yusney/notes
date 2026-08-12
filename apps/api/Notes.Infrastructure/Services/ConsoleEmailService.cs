using Notes.Application.Common.Interfaces;

namespace Notes.Infrastructure.Services;

/// <summary>
/// MVP stub — logs emails to console. Replace with a real provider (SendGrid, Postmark, etc.) later.
/// </summary>
public sealed class ConsoleEmailService : IEmailService
{
    public Task SendWelcomeEmailAsync(string to, string displayName, CancellationToken ct = default)
    {
        Console.WriteLine($"[EMAIL] Welcome to Notes! To: {to}, Name: {displayName}");
        return Task.CompletedTask;
    }

    public Task SendPasswordResetEmailAsync(string to, string resetLink, CancellationToken ct = default)
    {
        Console.WriteLine($"[EMAIL] Password reset. To: {to}, Link: {resetLink}");
        return Task.CompletedTask;
    }
}
