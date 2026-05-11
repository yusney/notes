using System.IO.Compression;
using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notes.Application.Features.Notes.Commands.CreateNote;
using Notes.Application.Features.Notes.Commands.DeleteNote;
using Notes.Application.Features.Notes.Commands.ToggleFavorite;
using Notes.Application.Features.Notes.Commands.UpdateNote;
using Notes.Application.Features.Notes.Queries.ExportNotes;
using Notes.Application.Features.Notes.Queries.GetNote;
using Notes.Application.Features.Notes.Queries.SearchNotes;
using Notes.Application.Features.SharedLinks.Commands.CreateSharedLink;
using Notes.Application.Features.SharedLinks.Queries.GetSharedLinks;
using Notes.Domain.Enums;

namespace Notes.Api.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly IMediator _mediator;

    public NotesController(IMediator mediator) => _mediator = mediator;

    // GET /api/notes?query=...&page=1&pageSize=20&tabId=...&tagIds=...&sortBy=...&sortOrder=...&isFavoriteOnly=...
    [HttpGet]
    public async Task<IActionResult> GetNotes(
        [FromQuery] string query = "",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? tabId = null,
        [FromQuery] List<Guid>? tagIds = null,
        [FromQuery] SortBy sortBy = SortBy.CreatedAt,
        [FromQuery] SortOrder sortOrder = SortOrder.Desc,
        [FromQuery] bool isFavoriteOnly = false,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(
            new SearchNotesQuery(userId, query, page, pageSize, tabId, tagIds, sortBy, sortOrder, isFavoriteOnly), ct);
        return Ok(result.Value);
    }

    // GET /api/notes/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetNote(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new GetNoteQuery(id, userId), ct);

        if (!result.IsSuccess)
            return NotFound(new { errors = result.Errors });

        return Ok(result.Value);
    }

    // POST /api/notes
    [HttpPost]
    public async Task<IActionResult> CreateNote([FromBody] CreateNoteRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(
            new CreateNoteCommand(userId, request.TabId, request.Title, request.Content,
                request.Language, request.TagNames), ct);

        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        return StatusCode(201, new { id = result.Value.ToString() });
    }

    // PUT /api/notes/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateNote(Guid id, [FromBody] UpdateNoteRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(
            new UpdateNoteCommand(id, userId, request.Title, request.Content, request.TagNames), ct);

        if (!result.IsSuccess)
            return NotFound(new { errors = result.Errors });

        return NoContent();
    }

    // DELETE /api/notes/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteNote(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new DeleteNoteCommand(id, userId), ct);

        if (!result.IsSuccess)
            return NotFound(new { errors = result.Errors });

        return NoContent();
    }

    // PUT /api/notes/{id}/favorite
    [HttpPut("{id:guid}/favorite")]
    public async Task<IActionResult> ToggleFavorite(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new ToggleFavoriteCommand(userId, id), ct);

        if (!result.IsSuccess)
            return NotFound(new { errors = result.Errors });

        return Ok(result.Value);
    }

    // POST /api/notes/{noteId}/share
    [HttpPost("{noteId:guid}/share")]
    public async Task<IActionResult> CreateShareLink(
        Guid noteId,
        [FromBody] CreateShareLinkRequest? request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(
            new CreateSharedLinkCommand(noteId, userId, request?.ExpiresAt), ct);

        if (!result.IsSuccess)
            return NotFound(new { errors = result.Errors });

        return StatusCode(201, result.Value);
    }

    // GET /api/notes/{noteId}/share-warning
    [HttpGet("{noteId:guid}/share-warning")]
    public async Task<IActionResult> GetShareWarning(Guid noteId, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new GetSharedLinksQuery(userId, noteId), ct);
        var activeLinks = result.Value?.Where(l => l.IsActive).ToList() ?? new();

        return Ok(new { hasActiveShares = activeLinks.Count > 0, count = activeLinks.Count });
    }

    // GET /api/notes/export
    [HttpGet("export")]
    public async Task<IActionResult> ExportNotes(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var result = await _mediator.Send(new ExportNotesQuery(userId), ct);
        if (!result.IsSuccess)
            return BadRequest(new { errors = result.Errors });

        var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        var fileName = $"notes-export-{timestamp}.zip";

        Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");

        // NOTE: We buffer in a MemoryStream because ZipArchive requires a seekable stream
        // for the central directory header. For text notes this is negligible; for very large
        // collections a streaming approach with a temp file would be needed.
        var outputStream = new MemoryStream();
        using (var zip = new ZipArchive(outputStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var note in result.Value!)
            {
                var safeTitle = string.Concat(note.Title
                    .Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));
                var entryName = $"{safeTitle}_{note.NoteId}.md";

                var entry = zip.CreateEntry(entryName, CompressionLevel.Optimal);
                using var writer = new StreamWriter(entry.Open());

                var tags = note.Tags.Count > 0
                    ? $"[{string.Join(", ", note.Tags.Select(t => $"\"{t}\""))}]"
                    : "[]";

                var frontmatter = $"""
                    ---
                    title: "{note.Title}"
                    createdAt: "{note.CreatedAt:O}"
                    updatedAt: "{note.UpdatedAt?.ToString("O") ?? ""}"
                    tags: {tags}
                    ---
                    {note.Content}
                    """;

                await writer.WriteAsync(frontmatter);
            }
        }

        outputStream.Seek(0, SeekOrigin.Begin);
        return File(outputStream, "application/zip", fileName);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }
}

public record CreateNoteRequest(
    Guid TabId,
    string Title,
    string Content,
    string Language,
    List<string>? TagNames = null);

public record UpdateNoteRequest(
    string Title,
    string Content,
    List<string>? TagNames = null);

public record CreateShareLinkRequest(DateTime? ExpiresAt = null);
