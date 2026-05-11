using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.Auth.Commands.RegisterUser;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using Notes.Domain.ValueObjects;

namespace Notes.Application.Features.Auth.Commands.OAuthLogin;

public class OAuthLoginCommandHandler : IRequestHandler<OAuthLoginCommand, Result<TokenPairDto>>
{
    private readonly IUserRepository _userRepository;
    private readonly ITabRepository _tabRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;

    public OAuthLoginCommandHandler(
        IUserRepository userRepository,
        ITabRepository tabRepository,
        IUnitOfWork unitOfWork,
        IJwtService jwtService)
    {
        _userRepository = userRepository;
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
            var pair = _jwtService.GenerateTokenPair(existingOAuth.Id, existingOAuth.Email.Value);
            return Result<TokenPairDto>.Ok(new TokenPairDto(pair.AccessToken, pair.RefreshToken));
        }

        // Check if a Local account exists with the same email — reject to prevent account takeover
        var existingLocal = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (existingLocal is not null && existingLocal.Provider == AuthProvider.Local)
            return Result<TokenPairDto>.Fail("Email is already registered with a password account.");

        // Create new OAuth user
        var email = new Email(request.Email);
        var newUser = User.CreateOAuth(
            Guid.NewGuid(), email, request.DisplayName, request.Provider, request.ProviderUserId);

        // Create default "General" tab
        var generalTab = new Tab(Guid.NewGuid(), newUser.Id, "General", 0);

        await _userRepository.AddAsync(newUser, cancellationToken);
        await _tabRepository.AddAsync(generalTab, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var tokenPair = _jwtService.GenerateTokenPair(newUser.Id, email.Value);
        return Result<TokenPairDto>.Ok(new TokenPairDto(tokenPair.AccessToken, tokenPair.RefreshToken));
    }
}
