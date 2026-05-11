using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Notes.Application.Common.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Api.Tests.Controllers;

/// <summary>
/// Integration tests for POST /api/auth/reset-password
/// </summary>
public class AuthController_ResetPasswordTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;
    private readonly HttpClient _client;

    public AuthController_ResetPasswordTests(NotesApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ResetPassword_ValidToken_Returns200()
    {
        // Arrange — register user, seed a valid token directly
        var email = $"reset_{Guid.NewGuid():N}@example.com";
        await RegisterUser(email);

        var (rawToken, _) = await SeedResetTokenAsync(email);

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = rawToken,
            newPassword = "NewSecurePass1!"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ResetPassword_InvalidToken_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = "invalid-token-that-does-not-exist",
            newPassword = "NewSecurePass1!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("errors", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ResetPassword_UsedToken_Returns400()
    {
        // Arrange — use the token once
        var email = $"used_{Guid.NewGuid():N}@example.com";
        await RegisterUser(email);

        var (rawToken, _) = await SeedResetTokenAsync(email);

        // First use — should succeed
        await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = rawToken,
            newPassword = "NewSecurePass1!"
        });

        // Second use — should fail because token is deleted (single-use)
        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = rawToken,
            newPassword = "AnotherSecurePass2!"
        });

        // Assert — token already consumed
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ResetPassword_WeakPassword_Returns400()
    {
        var email = $"weak_{Guid.NewGuid():N}@example.com";
        await RegisterUser(email);
        var (rawToken, _) = await SeedResetTokenAsync(email);

        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = rawToken,
            newPassword = "weak"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task RegisterUser(string email)
    {
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email, password = "SecurePass1!", displayName = "Reset User"
        });
    }

    /// <summary>
    /// Seeds a PasswordResetToken into the DB by calling IPasswordResetTokenRepository
    /// directly (bypasses email delivery). Returns (rawToken, tokenHash).
    /// </summary>
    private async Task<(string RawToken, string TokenHash)> SeedResetTokenAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var tokenRepo = scope.ServiceProvider.GetRequiredService<IPasswordResetTokenRepository>();
        var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var user = await userRepo.GetByEmailAsync(email);
        if (user is null) throw new InvalidOperationException($"User {email} not found in test DB.");

        var (tokenEntity, rawToken) = PasswordResetToken.Create(user.Id);

        await tokenRepo.AddAsync(tokenEntity);
        await uow.SaveChangesAsync();

        return (rawToken, tokenEntity.TokenHash);
    }
}
