using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Features.Tags.Commands.CreateTag;
using Notes.Application.Features.Tags.Commands.DeleteTag;
using Notes.Application.Features.Tags.Commands.UpdateTag;
using Notes.Application.Features.Tags.Queries.GetTags;

namespace Notes.Api.Controllers;

[ApiController]
[Route("api/tags")]
[Authorize]
public class TagsController : ControllerBase
{
    private readonly IMediator _mediator;

    public TagsController(IMediator mediator) => _mediator = mediator;

    // GET /api/tags
    [HttpGet]
    public async Task<IActionResult> GetTags(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new GetTagsQuery(userId), ct);
        return Ok(result.Value);
    }

    // POST /api/tags
    [HttpPost]
    public async Task<IActionResult> CreateTag([FromBody] CreateTagRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new CreateTagCommand(userId, request.Name), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        return StatusCode(201, new { id = result.Value.ToString() });
    }

    // PUT /api/tags/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTag(Guid id, [FromBody] UpdateTagRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new UpdateTagCommand(id, userId, request.NewName), ct);

        if (!result.IsSuccess)
            return NotFound(new { errors = result.Errors });

        return NoContent();
    }

    // DELETE /api/tags/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTag(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new DeleteTagCommand(id, userId), ct);

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

public record CreateTagRequest(string Name);
public record UpdateTagRequest(string NewName);
