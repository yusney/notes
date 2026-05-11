using System.Security.Cryptography;
using System.Text;
using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Auth.Queries.ValidateResetToken;

public class ValidateResetTokenQueryHandler : IRequestHandler<ValidateResetTokenQuery, Result<ValidateResetTokenResult>>
{
    private readonly IPasswordResetTokenRepository _tokenRepository;
    private readonly IUserRepository _userRepository;

    public ValidateResetTokenQueryHandler(
        IPasswordResetTokenRepository tokenRepository,
        IUserRepository userRepository)
    {
        _tokenRepository = tokenRepository;
        _userRepository = userRepository;
    }

    public async Task<Result<ValidateResetTokenResult>> Handle(
        ValidateResetTokenQuery request, CancellationToken cancellationToken)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(request.Token));
        var tokenHash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        var tokenEntity = await _tokenRepository.GetByHashAsync(tokenHash, cancellationToken);
        if (tokenEntity is null || !tokenEntity.IsValid(DateTime.UtcNow))
            return Result<ValidateResetTokenResult>.Fail("Invalid or expired token.");

        var user = await _userRepository.GetByIdAsync(tokenEntity.UserId, cancellationToken);
        if (user is null)
            return Result<ValidateResetTokenResult>.Fail("User not found.");

        return Result<ValidateResetTokenResult>.Ok(
            new ValidateResetTokenResult(user.Email.Value, user.Id));
    }
}
