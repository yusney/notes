using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.Auth.Commands.RegisterUser;
using Notes.Domain.Entities;
using DomainRefreshToken = Notes.Domain.Entities.RefreshToken;

namespace Notes.Application.Features.Auth.Commands.Login;

public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<TokenPairDto>>
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;
    private readonly IPasswordHasher _passwordHasher;

    public LoginCommandHandler(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnitOfWork unitOfWork,
        IJwtService jwtService,
        IPasswordHasher passwordHasher)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _passwordHasher = passwordHasher;
    }

    public async Task<Result<TokenPairDto>> Handle(
        LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);

        if (user is null || user.PasswordHash is null ||
            !_passwordHasher.Verify(request.Password, user.PasswordHash))
            return Result<TokenPairDto>.Fail("Invalid email or password.");

        // Generate JWT pair
        var pair = _jwtService.GenerateTokenPair(user.Id, user.Email.Value);

        // Persist refresh token entity
        var refreshToken = new DomainRefreshToken(Guid.NewGuid(), user.Id, pair.RefreshToken, DateTime.UtcNow);
        await _refreshTokenRepository.AddAsync(refreshToken, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TokenPairDto>.Ok(new TokenPairDto(pair.AccessToken, pair.RefreshToken));
    }
}
