using System.Security.Claims;
using System.Security.Cryptography;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Caching.Memory;
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
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;

    public AuthController(IMediator mediator, IMemoryCache cache, IConfiguration configuration)
    {
        _mediator = mediator;
        _cache = cache;
        _configuration = configuration;
    }

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
        var state = CreateOAuthState();
        var redirectUri = BuildCallbackUri("google");
        var authUrl = provider.BuildAuthorizationUrl(state, redirectUri);
        return Redirect(authUrl);
    }

    // GET /api/auth/oauth/google/callback
    [AllowAnonymous]
    [HttpGet("oauth/google/callback")]
    public async Task<IActionResult> GoogleCallback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        [FromKeyedServices("google")] IOAuthProvider provider,
        CancellationToken ct)
    {
        return await HandleOAuthCallback(provider, code, state, error, AuthProvider.Google, ct);
    }

    // GET /api/auth/oauth/github
    [AllowAnonymous]
    [HttpGet("oauth/github")]
    public IActionResult GitHubLogin([FromKeyedServices("github")] IOAuthProvider provider)
    {
        var state = CreateOAuthState();
        var redirectUri = BuildCallbackUri("github");
        var authUrl = provider.BuildAuthorizationUrl(state, redirectUri);
        return Redirect(authUrl);
    }

    // GET /api/auth/oauth/github/callback
    [AllowAnonymous]
    [HttpGet("oauth/github/callback")]
    public async Task<IActionResult> GitHubCallback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        [FromKeyedServices("github")] IOAuthProvider provider,
        CancellationToken ct)
    {
        return await HandleOAuthCallback(provider, code, state, error, AuthProvider.GitHub, ct);
    }

    // POST /api/auth/oauth/client/exchange
    [AllowAnonymous]
    [HttpPost("oauth/client/exchange")]
    public IActionResult ExchangeClientOAuthCode([FromBody] OAuthClientExchangeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { errors = new[] { "Code is required." } });

        var cacheKey = BuildOAuthClientCodeCacheKey(request.Code);
        if (!_cache.TryGetValue<TokenPairDto>(cacheKey, out var tokenPair) || tokenPair is null)
            return Unauthorized(new { errors = new[] { "Invalid or expired OAuth code." } });

        _cache.Remove(cacheKey);
        return Ok(new
        {
            accessToken = tokenPair.AccessToken,
            refreshToken = tokenPair.RefreshToken
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<IActionResult> HandleOAuthCallback(
        IOAuthProvider provider,
        string? code,
        string? state,
        string? error,
        AuthProvider authProvider,
        CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code))
        {
            // For installed clients, redirect with error to custom protocol
            var errorUrl = BuildOAuthRedirectUrl(null, error ?? "Authorization code missing.");
            return Redirect(errorUrl);
        }

        if (!ValidateAndConsumeOAuthState(state))
        {
            var errorUrl = BuildOAuthRedirectUrl(null, "Invalid OAuth state.");
            return Redirect(errorUrl);
        }

        var redirectUri = BuildCallbackUri(provider.Name);

        OAuthUserInfo userInfo;
        try
        {
            var tokens = await provider.ExchangeCodeAsync(code, redirectUri, ct);
            userInfo = await provider.GetUserInfoAsync(tokens.AccessToken, ct);
        }
        catch (Exception ex)
        {
            var errorUrl = BuildOAuthRedirectUrl(null, $"OAuth exchange failed: {ex.Message}");
            return Redirect(errorUrl);
        }

        var result = await _mediator.Send(
            new OAuthLoginCommand(
                authProvider,
                userInfo.ProviderId,
                userInfo.Email,
                userInfo.DisplayName,
                userInfo.EmailVerified), ct);

        if (!result.IsSuccess)
        {
            var errorUrl = BuildOAuthRedirectUrl(null, string.Join(", ", result.Errors));
            return Redirect(errorUrl);
        }

        // Never put bearer tokens in a custom protocol URL. The installed client
        // receives a short-lived one-time code and exchanges it over HTTPS.
        var clientCode = CreateOAuthClientCode(result.Value!);
        var successUrl = BuildOAuthRedirectUrl(clientCode, null);
        return Redirect(successUrl);
    }

    private string BuildOAuthRedirectUrl(string? code, string? error)
    {
        // Custom protocol for the installed Tauri client
        var protocol = "notes";
        var path = "auth/callback";

        var query = new List<string>();
        if (!string.IsNullOrEmpty(code))
            query.Add($"code={Uri.EscapeDataString(code)}");
        if (!string.IsNullOrEmpty(error))
            query.Add($"error={Uri.EscapeDataString(error)}");

        var queryString = query.Count > 0 ? $"?{string.Join("&", query)}" : "";
        return $"{protocol}://{path}{queryString}";
    }

    private string CreateOAuthState()
    {
        var state = CreateSecureToken();
        _cache.Set(BuildOAuthStateCacheKey(state), true, TimeSpan.FromMinutes(10));
        return state;
    }

    private bool ValidateAndConsumeOAuthState(string? state)
    {
        if (string.IsNullOrWhiteSpace(state))
            return false;

        var cacheKey = BuildOAuthStateCacheKey(state);
        if (!_cache.TryGetValue<bool>(cacheKey, out _))
            return false;

        _cache.Remove(cacheKey);
        return true;
    }

    private string CreateOAuthClientCode(TokenPairDto tokenPair)
    {
        var code = CreateSecureToken();
        _cache.Set(BuildOAuthClientCodeCacheKey(code), tokenPair, TimeSpan.FromMinutes(2));
        return code;
    }

    private static string CreateSecureToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return WebEncoders.Base64UrlEncode(bytes);
    }

    private static string BuildOAuthStateCacheKey(string state) => $"oauth-state:{state}";

    private static string BuildOAuthClientCodeCacheKey(string code) => $"oauth-client-code:{code}";

    private string BuildCallbackUri(string providerName)
    {
        var publicBaseUrl = _configuration["OAuth:PublicBaseUrl"]?.TrimEnd('/');
        if (!string.IsNullOrWhiteSpace(publicBaseUrl))
            return $"{publicBaseUrl}/api/auth/oauth/{providerName}/callback";

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
public record OAuthClientExchangeRequest(string Code);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
