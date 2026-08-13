using System.Security.Cryptography;
using System.Text;
using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Domain.Entities;

namespace Notes.Application.Features.Auth.Commands.ForgotPassword;

public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, Result>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordResetTokenRepository _tokenRepository;
    private readonly IEmailService _emailService;
    private readonly IUnitOfWork _unitOfWork;

    public ForgotPasswordCommandHandler(
        IUserRepository userRepository,
        IPasswordResetTokenRepository tokenRepository,
        IEmailService emailService,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _tokenRepository = tokenRepository;
        _emailService = emailService;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        // Always return success — never leak if email is registered (anti-enumeration)
        var user = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null)
            return Result.Ok();

        // Generate token and store hashed version
        var (tokenEntity, plainToken) = PasswordResetToken.Create(user.Id);
        await _tokenRepository.AddAsync(tokenEntity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Send email with reset link (link building is caller's concern — handler passes plain token)
        var resetLink = $"/reset-password?token={plainToken}";
        await _emailService.SendPasswordResetEmailAsync(request.Email, resetLink, cancellationToken);

        return Result.Ok();
    }
}
