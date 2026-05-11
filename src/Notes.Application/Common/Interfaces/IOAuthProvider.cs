namespace Notes.Application.Common.Interfaces;

public record OAuthTokenResponse(string AccessToken, string? RefreshToken);

public record OAuthUserInfo(string ProviderId, string Email, string DisplayName);

public interface IOAuthProvider
{
    string Name { get; }
    string BuildAuthorizationUrl(string state, string redirectUri);
    Task<OAuthTokenResponse> ExchangeCodeAsync(string code, string redirectUri, CancellationToken ct = default);
    Task<OAuthUserInfo> GetUserInfoAsync(string accessToken, CancellationToken ct = default);
}
