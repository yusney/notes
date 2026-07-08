using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Users.Queries.GetUserProfile;

public record GetUserProfileQuery(Guid UserId) : IRequest<Result<UserProfileDto>>;

public record UserProfileDto(
    Guid Id,
    string DisplayName,
    string Email,
    string Provider,
    DateTime CreatedAt);
