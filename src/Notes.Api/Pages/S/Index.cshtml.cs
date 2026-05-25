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
