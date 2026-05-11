using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Notes.Application.Common.Interfaces;
using Notes.Domain.Entities;

namespace Notes.Api.Tests.Controllers;

/// <summary>
/// Integration tests for GET /api/auth/validate-reset-token
/// </summary>
public class AuthController_ValidateResetTokenTests : IClassFixture<NotesApiFactory>
{
    private readonly NotesApiFactory _factory;
    private readonly HttpClient _client;

    public AuthController_ValidateResetTokenTests(NotesApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ValidateResetToken_ValidToken_Returns200WithEmailAndUserId()
    {
        // Arrange
        var email = $"validate_{Guid.NewGuid():N}@example.com";
        await RegisterUser(email);
        var (rawToken, _) = await SeedResetTokenAsync(email);

        // Act
        var response = await _client.GetAsync($"/api/auth/validate-reset-token?token={Uri.EscapeDataString(rawToken)}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("email").GetString().Should().Be(email);
        body.TryGetProperty("userId", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ValidateResetToken_InvalidToken_Returns400()
    {
        var response = await _client.GetAsync("/api/auth/validate-reset-token?token=garbage-token");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("errors", out _).Should().BeTrue();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task RegisterUser(string email)
    {
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email, password = "SecurePass1!", displayName = "Validate User"
        });
    }

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
