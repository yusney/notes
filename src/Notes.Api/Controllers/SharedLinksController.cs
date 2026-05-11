using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Features.SharedLinks.Commands.CreateSharedLink;
using Notes.Application.Features.SharedLinks.Commands.RevokeSharedLink;
using Notes.Application.Features.SharedLinks.Queries.GetSharedLinks;

namespace Notes.Api.Controllers;

[ApiController]
[Authorize]
public class SharedLinksController : ControllerBase
{
    private readonly IMediator _mediator;

    public SharedLinksController(IMediator mediator) => _mediator = mediator;

    // GET /api/shared-links?noteId=...
    [HttpGet("api/shared-links")]
    public async Task<IActionResult> GetSharedLinks(
        [FromQuery] Guid? noteId = null,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new GetSharedLinksQuery(userId, noteId), ct);
        return Ok(result.Value);
    }

    // DELETE /api/shared-links/{token}
    [HttpDelete("api/shared-links/{token}")]
    public async Task<IActionResult> RevokeShareLink(string token, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new RevokeSharedLinkCommand(token, userId), ct);
        if (!result.IsSuccess)
            return NotFound(new { errors = result.Errors });

        return NoContent();
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }
}
