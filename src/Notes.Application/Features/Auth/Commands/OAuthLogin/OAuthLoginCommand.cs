using MediatR;
using Notes.Application.Common.Models;
using Notes.Application.Features.Auth.Commands.RegisterUser;
using Notes.Domain.Enums;

namespace Notes.Application.Features.Auth.Commands.OAuthLogin;

public record OAuthLoginCommand(
    AuthProvider Provider,
    string ProviderUserId,
    string Email,
    string DisplayName) : IRequest<Result<TokenPairDto>>;
