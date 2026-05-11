using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Auth.Commands.ResetPassword;

public record ResetPasswordCommand(string Token, string NewPassword) : IRequest<Result>;
