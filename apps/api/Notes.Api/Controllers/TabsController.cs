using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Features.Tabs.Commands.CreateTab;
using Notes.Application.Features.Tabs.Commands.DeleteTab;
using Notes.Application.Features.Tabs.Queries.GetTabs;

namespace Notes.Api.Controllers;

[ApiController]
[Route("api/tabs")]
[Authorize]
public class TabsController : ControllerBase
{
    private readonly IMediator _mediator;

    public TabsController(IMediator mediator) => _mediator = mediator;

    // GET /api/tabs
    [HttpGet]
    public async Task<IActionResult> GetTabs(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new GetTabsQuery(userId), ct);
        return Ok(result.Value);
    }

    // POST /api/tabs
    [HttpPost]
    public async Task<IActionResult> CreateTab([FromBody] CreateTabRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new CreateTabCommand(userId, request.Name), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        return StatusCode(201, new { id = result.Value.ToString() });
    }

    // DELETE /api/tabs/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTab(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new DeleteTabCommand(id, userId), ct);

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

public record CreateTabRequest(string Name);
