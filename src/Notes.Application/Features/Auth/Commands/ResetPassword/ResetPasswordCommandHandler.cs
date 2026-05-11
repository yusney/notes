using System.Security.Cryptography;
using System.Text;
using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Auth.Commands.ResetPassword;

public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, Result>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordResetTokenRepository _tokenRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUnitOfWork _unitOfWork;

    public ResetPasswordCommandHandler(
        IUserRepository userRepository,
        IPasswordResetTokenRepository tokenRepository,
        IPasswordHasher passwordHasher,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _tokenRepository = tokenRepository;
        _passwordHasher = passwordHasher;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        // Hash the plain token to look up in the database
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(request.Token));
        var tokenHash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        var tokenEntity = await _tokenRepository.GetByHashAsync(tokenHash, cancellationToken);
        if (tokenEntity is null || !tokenEntity.IsValid(DateTime.UtcNow))
            return Result.Fail("Invalid or expired token.");

        var user = await _userRepository.GetByIdAsync(tokenEntity.UserId, cancellationToken);
        if (user is null)
            return Result.Fail("User not found.");

        // Update password
        var newHash = _passwordHasher.Hash(request.NewPassword);
        user.UpdatePassword(newHash);

        // Delete the token (single-use)
        await _tokenRepository.DeleteAsync(tokenEntity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }
}
