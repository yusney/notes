using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Users.Commands.ChangePassword;

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, Result>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUnitOfWork _unitOfWork;

    public ChangePasswordCommandHandler(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(
        ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId, cancellationToken);
        if (user is null)
            return Result.Fail("User not found.");

        var isCurrentValid = _passwordHasher.Verify(request.CurrentPassword, user.PasswordHash!);
        if (!isCurrentValid)
            return Result.Fail("Current password is incorrect.");

        var newHash = _passwordHasher.Hash(request.NewPassword);
        user.UpdatePassword(newHash);
        await _userRepository.UpdateAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }
}
