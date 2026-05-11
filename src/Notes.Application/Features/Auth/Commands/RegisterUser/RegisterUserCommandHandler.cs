using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;

namespace Notes.Application.Features.Auth.Commands.RegisterUser;

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, Result<TokenPairDto>>
{
    private readonly IUserRepository _userRepository;
    private readonly ITabRepository _tabRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;
    private readonly IPasswordHasher _passwordHasher;

    public RegisterUserCommandHandler(
        IUserRepository userRepository,
        ITabRepository tabRepository,
        IUnitOfWork unitOfWork,
        IJwtService jwtService,
        IPasswordHasher passwordHasher)
    {
        _userRepository = userRepository;
        _tabRepository = tabRepository;
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _passwordHasher = passwordHasher;
    }

    public async Task<Result<TokenPairDto>> Handle(
        RegisterUserCommand request, CancellationToken cancellationToken)
    {
        // Check email uniqueness
        var existing = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (existing is not null)
            return Result<TokenPairDto>.Fail("Email is already registered.");

        // Create user
        var email = new Email(request.Email);
        var passwordHash = _passwordHasher.Hash(request.Password);
        var user = User.CreateLocal(Guid.NewGuid(), email, request.DisplayName, passwordHash);

        // Create default "General" tab
        var generalTab = new Tab(Guid.NewGuid(), user.Id, "General", 0);

        // Persist atomically
        await _userRepository.AddAsync(user, cancellationToken);
        await _tabRepository.AddAsync(generalTab, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Issue tokens
        var pair = _jwtService.GenerateTokenPair(user.Id, email.Value);

        return Result<TokenPairDto>.Ok(new TokenPairDto(pair.AccessToken, pair.RefreshToken));
    }
}
