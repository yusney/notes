namespace Notes.Application.Common.Interfaces;

public record TokenPair(string AccessToken, string RefreshToken);

public interface IJwtService
{
    TokenPair GenerateTokenPair(Guid userId, string email);
    Guid? ValidateAccessToken(string token);
}
