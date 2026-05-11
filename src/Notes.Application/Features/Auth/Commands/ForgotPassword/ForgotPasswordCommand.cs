using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Auth.Commands.ForgotPassword;

public record ForgotPasswordCommand(string Email) : IRequest<Result>;
