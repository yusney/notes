using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Auth.Commands.Logout;

public record LogoutCommand(Guid UserId) : IRequest<Result>;
