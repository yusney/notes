using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Auth.Commands.RegisterUser;

public record RegisterUserCommand(
    string Email,
    string Password,
    string DisplayName) : IRequest<Result<TokenPairDto>>;

public record TokenPairDto(string AccessToken, string RefreshToken);
