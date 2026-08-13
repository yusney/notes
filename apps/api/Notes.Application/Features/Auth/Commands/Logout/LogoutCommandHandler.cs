using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Auth.Commands.Logout;

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, Result>
{
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;

    public LogoutCommandHandler(
        IRefreshTokenRepository refreshTokenRepository,
        IUnitOfWork unitOfWork)
    {
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        // Revoke all refresh tokens for the user (invalidate all sessions)
        await _refreshTokenRepository.RevokeAllForUserAsync(request.UserId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Ok();
    }
}
