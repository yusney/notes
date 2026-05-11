using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Features.SharedLinks.Queries.GetSharedNoteByToken;

namespace Notes.Api.Controllers;

[ApiController]
[AllowAnonymous]
public class PublicNotesController : ControllerBase
{
    private readonly IMediator _mediator;

    public PublicNotesController(IMediator mediator) => _mediator = mediator;

    // GET /share/{token}
    [HttpGet("share/{token}")]
    public async Task<IActionResult> GetSharedNote(string token, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetSharedNoteByTokenQuery(token), ct);

        if (!result.IsSuccess)
            return NotFound(new { errors = result.Errors });

        return Ok(result.Value);
    }
}
