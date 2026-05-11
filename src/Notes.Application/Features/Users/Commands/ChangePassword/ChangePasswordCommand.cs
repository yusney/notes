using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Users.Commands.ChangePassword;

public record ChangePasswordCommand(Guid UserId, string CurrentPassword, string NewPassword) : IRequest<Result>;
