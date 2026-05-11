namespace Notes.Application.Features.SharedLinks.Dtos;

public record SharedLinkDto(
    Guid Id,
    string Token,
    Guid NoteId,
    DateTime CreatedAt,
    DateTime? ExpiresAt,
    bool IsActive);

public record SharedNoteDto(
    string Title,
    string Content,
    string Language,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
