using MediatR;
using Notes.Application.Common.Models;

namespace Notes.Application.Features.Auth.Queries.ValidateResetToken;

public record ValidateResetTokenResult(string Email, Guid UserId);

public record ValidateResetTokenQuery(string Token) : IRequest<Result<ValidateResetTokenResult>>;
