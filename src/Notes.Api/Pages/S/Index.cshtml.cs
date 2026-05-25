using Ganss.Xss;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Notes.Application.Features.SharedLinks.Queries.GetSharedNoteByToken;

namespace Notes.Api.Pages.S;

[AllowAnonymous]
public class IndexModel : PageModel
{
    private readonly ISender _sender;
    private readonly HtmlSanitizer _sanitizer;

    [BindProperty(SupportsGet = true)]
    public string Token { get; set; } = string.Empty;

    public SharedNoteViewModel? Note { get; private set; }

    public IndexModel(ISender sender, HtmlSanitizer sanitizer)
    {
        _sender = sender;
        _sanitizer = sanitizer;
    }

    /// <summary>
    /// Handles GET /s/{token}. Resolves the token via the shared link query;
    /// if the link is missing, revoked, or expired, redirects to the NotFound page.
    /// The note title is placed into ViewData["Title"] — Razor's @ViewData syntax
    /// HTML-encodes it automatically, so no HtmlSanitizer pass is needed for the title.
    /// </summary>
    public async Task<IActionResult> OnGetAsync()
    {
        var query = new GetSharedNoteByTokenQuery(Token);
        var result = await _sender.Send(query);

        if (!result.IsSuccess)
            return RedirectToPage("/S/NotFound");

        Note = new SharedNoteViewModel(
            Title: result.Value!.Title,
            SanitizedContent: _sanitizer.Sanitize(result.Value.Content),
            CreatedAt: result.Value.CreatedAt,
            UpdatedAt: result.Value.UpdatedAt
        );

        return Page();
    }
}

public record SharedNoteViewModel(
    string Title,
    string SanitizedContent,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
