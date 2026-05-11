using MediatR;
using Notes.Application.Common.Models;
using Notes.Application.Features.Auth.Commands.RegisterUser;

namespace Notes.Application.Features.Auth.Commands.Login;

public record LoginCommand(string Email, string Password) : IRequest<Result<TokenPairDto>>;
