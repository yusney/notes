using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.Auth.Commands.RegisterUser;
using Notes.Domain.Entities;
using DomainRefreshToken = Notes.Domain.Entities.RefreshToken;

namespace Notes.Application.Features.Auth.Commands.RefreshToken;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, Result<TokenPairDto>>
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;

    public RefreshTokenCommandHandler(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnitOfWork unitOfWork,
        IJwtService jwtService)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
    }

    public async Task<Result<TokenPairDto>> Handle(
        RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var token = await _refreshTokenRepository.GetByTokenAsync(request.Token, cancellationToken);

        if (token is null || !token.IsValid(DateTime.UtcNow))
            return Result<TokenPairDto>.Fail("Invalid or expired refresh token.");

        var user = await _userRepository.GetByIdAsync(token.UserId, cancellationToken);
        if (user is null)
            return Result<TokenPairDto>.Fail("User not found.");

        // Rotate: revoke old, issue new pair
        token.Revoke();
        await _refreshTokenRepository.UpdateAsync(token, cancellationToken);

        var pair = _jwtService.GenerateTokenPair(user.Id, user.Email.Value);
        var newRefreshToken = new DomainRefreshToken(Guid.NewGuid(), user.Id, pair.RefreshToken, DateTime.UtcNow);
        await _refreshTokenRepository.AddAsync(newRefreshToken, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TokenPairDto>.Ok(new TokenPairDto(pair.AccessToken, pair.RefreshToken));
    }
}
