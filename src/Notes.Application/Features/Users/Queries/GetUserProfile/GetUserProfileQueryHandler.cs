using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Users.Queries.GetUserProfile;

public class GetUserProfileQueryHandler : IRequestHandler<GetUserProfileQuery, Result<UserProfileDto>>
{
    private readonly IUserRepository _userRepository;

    public GetUserProfileQueryHandler(IUserRepository userRepository) => _userRepository = userRepository;

    public async Task<Result<UserProfileDto>> Handle(
        GetUserProfileQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId, cancellationToken);
        if (user is null)
            return Result<UserProfileDto>.Fail("User not found.");

        return Result<UserProfileDto>.Ok(new UserProfileDto(
            user.Id,
            user.DisplayName,
            user.Email.Value,
            user.Provider.ToString(),
            user.CreatedAt));
    }
}
