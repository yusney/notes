using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Notes.Commands.ToggleFavorite;

public record ToggleFavoriteCommand(Guid UserId, Guid NoteId) : IRequest<Result<NoteFavoriteDto>>;

public record NoteFavoriteDto(Guid Id, bool IsFavorite, DateTime? FavoritedAt);
