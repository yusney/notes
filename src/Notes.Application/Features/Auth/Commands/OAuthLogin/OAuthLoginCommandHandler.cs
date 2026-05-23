using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.Auth.Commands.RegisterUser;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using Notes.Domain.ValueObjects;
using DomainRefreshToken = Notes.Domain.Entities.RefreshToken;

namespace Notes.Application.Features.Auth.Commands.OAuthLogin;

public class OAuthLoginCommandHandler : IRequestHandler<OAuthLoginCommand, Result<TokenPairDto>>
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ITabRepository _tabRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;

    public OAuthLoginCommandHandler(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        ITabRepository tabRepository,
        IUnitOfWork unitOfWork,
        IJwtService jwtService)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _tabRepository = tabRepository;
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
    }

    public async Task<Result<TokenPairDto>> Handle(OAuthLoginCommand request, CancellationToken cancellationToken)
    {
        // Check if user already has an OAuth account with this provider
        var existingOAuth = await _userRepository.GetByProviderAsync(
            request.Provider, request.ProviderUserId, cancellationToken);

        if (existingOAuth is not null)
        {
            // Returning OAuth user — just issue tokens
            return await IssueTokenPairAsync(existingOAuth, cancellationToken);
        }

        // If a user already exists with the same verified email, treat OAuth as
        // an additional trusted login method for that account. This prevents
        // duplicate accounts while still blocking account takeover for providers
        // that cannot prove email ownership.
        var existingByEmail = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (existingByEmail is not null)
        {
            if (!request.EmailVerified)
                return Result<TokenPairDto>.Fail("OAuth email must be verified to sign in to an existing account.");

            return await IssueTokenPairAsync(existingByEmail, cancellationToken);
        }

        // Create new OAuth user
        var email = new Email(request.Email);
        var newUser = User.CreateOAuth(
            Guid.NewGuid(), email, request.DisplayName, request.Provider, request.ProviderUserId);

        // Create default "General" tab
        var generalTab = new Tab(Guid.NewGuid(), newUser.Id, "General", 0);

        await _userRepository.AddAsync(newUser, cancellationToken);
        await _tabRepository.AddAsync(generalTab, cancellationToken);

        return await IssueTokenPairAsync(newUser, cancellationToken);
    }

    private async Task<Result<TokenPairDto>> IssueTokenPairAsync(User user, CancellationToken cancellationToken)
    {
        var pair = _jwtService.GenerateTokenPair(user.Id, user.Email.Value);
        var refreshToken = new DomainRefreshToken(Guid.NewGuid(), user.Id, pair.RefreshToken, DateTime.UtcNow);

        await _refreshTokenRepository.AddAsync(refreshToken, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TokenPairDto>.Ok(new TokenPairDto(pair.AccessToken, pair.RefreshToken));
    }
}
