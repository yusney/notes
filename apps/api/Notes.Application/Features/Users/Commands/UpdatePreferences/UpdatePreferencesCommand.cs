using MediatR;
using Notes.Application.Common.Models;
using Notes.Application.Features.Users.Queries.GetUserPreferences;
using Notes.Domain.Enums;

namespace Notes.Application.Features.Users.Commands.UpdatePreferences;

public record UpdatePreferencesCommand(
    Guid UserId,
    Theme Theme,
    SortBy SortBy,
    SortOrder SortOrder) : IRequest<Result<UserPreferencesDto>>;
