using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Features.Users.Commands.ChangePassword;
using Notes.Application.Features.Users.Commands.UpdatePreferences;
using Notes.Application.Features.Users.Commands.UpdateProfile;
using Notes.Application.Features.Users.Queries.GetUserPreferences;
using Notes.Application.Features.Users.Queries.GetUserProfile;
using Notes.Domain.Enums;

namespace Notes.Api.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IMediator _mediator;

    public UserController(IMediator mediator) => _mediator = mediator;

    // GET /api/user/profile
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new GetUserProfileQuery(userId), ct);

        if (!result.IsSuccess)
            return NotFound(new { errors = result.Errors });

        return Ok(result.Value);
    }

    // PUT /api/user/profile
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new UpdateProfileCommand(userId, request.DisplayName), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        return Ok(result.Value);
    }

    // PUT /api/user/password
    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(
            new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        return NoContent();
    }

    // GET /api/user/preferences
    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new GetUserPreferencesQuery(userId), ct);

        if (!result.IsSuccess)
            return NotFound(new { errors = result.Errors });

        return Ok(result.Value);
    }

    // PUT /api/user/preferences
    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(
            new UpdatePreferencesCommand(userId, request.Theme, request.SortBy, request.SortOrder), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        return Ok(result.Value);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────
public record UpdateProfileRequest(string DisplayName);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record UpdatePreferencesRequest(Theme Theme, SortBy SortBy, SortOrder SortOrder);
