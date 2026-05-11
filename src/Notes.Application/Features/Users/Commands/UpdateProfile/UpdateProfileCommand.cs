using MediatR;
using Notes.Application.Common.Models;
using Notes.Application.Features.Users.Queries.GetUserProfile;

namespace Notes.Application.Features.Users.Commands.UpdateProfile;

public record UpdateProfileCommand(Guid UserId, string DisplayName) : IRequest<Result<UserProfileDto>>;
