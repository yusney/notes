using MediatR;
using Notes.Application.Common.Models;
using Notes.Domain.Enums;

namespace Notes.Application.Features.Users.Queries.GetUserPreferences;

public record GetUserPreferencesQuery(Guid UserId) : IRequest<Result<UserPreferencesDto>>;

public record UserPreferencesDto(Theme Theme, SortBy SortBy, SortOrder SortOrder);
