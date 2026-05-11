using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Notes.Application.Common.Interfaces;

namespace Notes.Infrastructure.Auth.OAuthProviders;

/// <summary>
/// Google OAuth 2.0 provider.
/// Uses authorization code flow; exchanges code for tokens via token endpoint,
/// then fetches user info from userinfo endpoint.
/// </summary>
public sealed class GoogleOAuthProvider : IOAuthProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _clientId;
    private readonly string _clientSecret;

    private const string AuthBaseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private const string UserInfoEndpoint = "https://www.googleapis.com/oauth2/v3/userinfo";

    public string Name => "google";

    public GoogleOAuthProvider(HttpClient httpClient, string clientId, string clientSecret)
    {
        _httpClient = httpClient;
        _clientId = clientId;
        _clientSecret = clientSecret;
    }

    public string BuildAuthorizationUrl(string state, string redirectUri)
    {
        var query = System.Web.HttpUtility.ParseQueryString(string.Empty);
        query["client_id"] = _clientId;
        query["redirect_uri"] = redirectUri;
        query["response_type"] = "code";
        query["scope"] = "openid email profile";
        query["state"] = state;
        return $"{AuthBaseUrl}?{query}";
    }

    public async Task<OAuthTokenResponse> ExchangeCodeAsync(
        string code, string redirectUri, CancellationToken ct = default)
    {
        var payload = new Dictionary<string, string>
        {
            ["client_id"] = _clientId,
            ["client_secret"] = _clientSecret,
            ["code"] = code,
            ["redirect_uri"] = redirectUri,
            ["grant_type"] = "authorization_code"
        };

        var response = await _httpClient.PostAsync(TokenEndpoint, new FormUrlEncodedContent(payload), ct);
        response.EnsureSuccessStatusCode();

        var data = await response.Content.ReadFromJsonAsync<GoogleTokenResponse>(cancellationToken: ct)
                   ?? throw new InvalidOperationException("Failed to deserialize Google token response.");

        return new OAuthTokenResponse(data.AccessToken, data.RefreshToken);
    }

    public async Task<OAuthUserInfo> GetUserInfoAsync(string accessToken, CancellationToken ct = default)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, UserInfoEndpoint);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var data = await response.Content.ReadFromJsonAsync<GoogleUserInfoResponse>(cancellationToken: ct)
                   ?? throw new InvalidOperationException("Failed to deserialize Google userinfo response.");

        return new OAuthUserInfo(data.Sub, data.Email, data.Name ?? data.Email);
    }

    private sealed record GoogleTokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("refresh_token")] string? RefreshToken);

    private sealed record GoogleUserInfoResponse(
        [property: JsonPropertyName("sub")] string Sub,
        [property: JsonPropertyName("email")] string Email,
        [property: JsonPropertyName("name")] string? Name);
}
