using MediatR;
using Notes.Application.Common.Models;
using Notes.Application.Features.Auth.Commands.RegisterUser;

namespace Notes.Application.Features.Auth.Commands.RefreshToken;

public record RefreshTokenCommand(string Token) : IRequest<Result<TokenPairDto>>;
