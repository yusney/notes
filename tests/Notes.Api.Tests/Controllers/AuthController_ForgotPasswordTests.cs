using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Notes.Api.Tests.Controllers;

/// <summary>
/// Integration tests for POST /api/auth/forgot-password
/// </summary>
public class AuthController_ForgotPasswordTests : IClassFixture<NotesApiFactory>
{
    private readonly HttpClient _client;

    public AuthController_ForgotPasswordTests(NotesApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ForgotPassword_KnownEmail_Returns200()
    {
        // Arrange — register a real user first
        var email = $"forgot_{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email, password = "SecurePass1!", displayName = "Forgot User"
        });

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email
        });

        // Assert — always 200 (security: don't leak user existence)
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ForgotPassword_UnknownEmail_Returns200_DoesNotLeakExistence()
    {
        // Act — email that was never registered
        var response = await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email = "ghost-user@nowhere.invalid"
        });

        // Assert — same 200 as known user to prevent enumeration
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ForgotPassword_InvalidEmailFormat_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            email = "not-an-email"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("errors", out _).Should().BeTrue();
    }
}
