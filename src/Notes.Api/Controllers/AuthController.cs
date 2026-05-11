using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Auth.Commands.ForgotPassword;
using Notes.Application.Features.Auth.Commands.Login;
using Notes.Application.Features.Auth.Commands.Logout;
using Notes.Application.Features.Auth.Commands.OAuthLogin;
using Notes.Application.Features.Auth.Commands.RefreshToken;
using Notes.Application.Features.Auth.Commands.RegisterUser;
using Notes.Application.Features.Auth.Commands.ResetPassword;
using Notes.Application.Features.Auth.Queries.ValidateResetToken;
using Notes.Domain.Enums;

namespace Notes.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator) => _mediator = mediator;

    // POST /api/auth/register
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(
            new RegisterUserCommand(request.Email, request.Password, request.DisplayName), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        return StatusCode(201, new
        {
            accessToken = result.Value!.AccessToken,
            refreshToken = result.Value.RefreshToken
        });
    }

    // POST /api/auth/login
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new LoginCommand(request.Email, request.Password), ct);

        if (!result.IsSuccess)
            return Unauthorized(new { errors = result.Errors });

        return Ok(new
        {
            accessToken = result.Value!.AccessToken,
            refreshToken = result.Value.RefreshToken
        });
    }

    // POST /api/auth/refresh
    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new RefreshTokenCommand(request.Token), ct);

        if (!result.IsSuccess)
            return Unauthorized(new { errors = result.Errors });

        return Ok(new
        {
            accessToken = result.Value!.AccessToken,
            refreshToken = result.Value.RefreshToken
        });
    }

    // POST /api/auth/logout
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized();

        await _mediator.Send(new LogoutCommand(userId), ct);
        return NoContent();
    }

    // ── Password Reset ────────────────────────────────────────────────────────

    // POST /api/auth/forgot-password
    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ForgotPasswordCommand(request.Email), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        // Always return 200 — don't reveal whether the email exists
        return Ok();
    }

    // POST /api/auth/reset-password
    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ResetPasswordCommand(request.Token, request.NewPassword), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        return Ok();
    }

    // GET /api/auth/validate-reset-token?token=xxx
    [AllowAnonymous]
    [HttpGet("validate-reset-token")]
    public async Task<IActionResult> ValidateResetToken([FromQuery] string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { errors = new[] { "Token is required." } });

        var result = await _mediator.Send(new ValidateResetTokenQuery(token), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        return Ok(new
        {
            email = result.Value!.Email,
            userId = result.Value.UserId
        });
    }

    // ── OAuth ─────────────────────────────────────────────────────────────────

    // GET /api/auth/oauth/google
    [AllowAnonymous]
    [HttpGet("oauth/google")]
    public IActionResult GoogleLogin([FromKeyedServices("google")] IOAuthProvider provider)
    {
        var state = Guid.NewGuid().ToString("N");
        var redirectUri = BuildCallbackUri("google");
        var authUrl = provider.BuildAuthorizationUrl(state, redirectUri);
        return Redirect(authUrl);
    }

    // GET /api/auth/oauth/google/callback
    [AllowAnonymous]
    [HttpGet("oauth/google/callback")]
    public async Task<IActionResult> GoogleCallback(
        [FromQuery] string? code,
        [FromQuery] string? error,
        [FromKeyedServices("google")] IOAuthProvider provider,
        CancellationToken ct)
    {
        return await HandleOAuthCallback(provider, code, error, AuthProvider.Google, ct);
    }

    // GET /api/auth/oauth/github
    [AllowAnonymous]
    [HttpGet("oauth/github")]
    public IActionResult GitHubLogin([FromKeyedServices("github")] IOAuthProvider provider)
    {
        var state = Guid.NewGuid().ToString("N");
        var redirectUri = BuildCallbackUri("github");
        var authUrl = provider.BuildAuthorizationUrl(state, redirectUri);
        return Redirect(authUrl);
    }

    // GET /api/auth/oauth/github/callback
    [AllowAnonymous]
    [HttpGet("oauth/github/callback")]
    public async Task<IActionResult> GitHubCallback(
        [FromQuery] string? code,
        [FromQuery] string? error,
        [FromKeyedServices("github")] IOAuthProvider provider,
        CancellationToken ct)
    {
        return await HandleOAuthCallback(provider, code, error, AuthProvider.GitHub, ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<IActionResult> HandleOAuthCallback(
        IOAuthProvider provider,
        string? code,
        string? error,
        AuthProvider authProvider,
        CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code))
            return BadRequest(new { errors = new[] { error ?? "Authorization code missing." } });

        var redirectUri = BuildCallbackUri(provider.Name);

        OAuthUserInfo userInfo;
        try
        {
            var tokens = await provider.ExchangeCodeAsync(code, redirectUri, ct);
            userInfo = await provider.GetUserInfoAsync(tokens.AccessToken, ct);
        }
        catch (Exception ex)
        {
            return BadRequest(new { errors = new[] { $"OAuth exchange failed: {ex.Message}" } });
        }

        var result = await _mediator.Send(
            new OAuthLoginCommand(authProvider, userInfo.ProviderId, userInfo.Email, userInfo.DisplayName), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        return Ok(new
        {
            accessToken = result.Value!.AccessToken,
            refreshToken = result.Value.RefreshToken
        });
    }

    private string BuildCallbackUri(string providerName)
    {
        var scheme = Request.Scheme;
        var host = Request.Host.Value;
        return $"{scheme}://{host}/api/auth/oauth/{providerName}/callback";
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────
public record RegisterRequest(string Email, string Password, string DisplayName);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string Token);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
