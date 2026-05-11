using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Notes.Application.Common.Interfaces;

namespace Notes.Infrastructure.Services;

public sealed class JwtService : IJwtService
{
    private const int AccessTokenMinutes = 15;
    private const int RefreshTokenBytes = 64;

    private readonly string _secret;
    private readonly string _issuer;
    private readonly string _audience;

    public JwtService(string secret, string issuer, string audience)
    {
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
            throw new ArgumentException("JWT secret must be at least 32 characters.", nameof(secret));

        _secret = secret;
        _issuer = issuer;
        _audience = audience;
    }

    public TokenPair GenerateTokenPair(Guid userId, string email)
    {
        var accessToken = GenerateAccessToken(userId, email);
        var refreshToken = GenerateRefreshToken();
        return new TokenPair(accessToken, refreshToken);
    }

    public Guid? ValidateAccessToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));

        try
        {
            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out var validatedToken);

            var jwt = (JwtSecurityToken)validatedToken;
            var userIdClaim = jwt.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;

            return Guid.TryParse(userIdClaim, out var parsed) ? parsed : null;
        }
        catch
        {
            return null;
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private string GenerateAccessToken(Guid userId, string email)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("sub", userId.ToString()),
            new Claim("email", email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(AccessTokenMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(RefreshTokenBytes);
        return Convert.ToBase64String(bytes);
    }
}
