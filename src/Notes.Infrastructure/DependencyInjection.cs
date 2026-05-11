using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Notes.Application.Common.Interfaces;
using Notes.Infrastructure.Auth.OAuthProviders;
using Notes.Infrastructure.Persistence;
using Notes.Infrastructure.Persistence.Repositories;
using Notes.Infrastructure.Services;

namespace Notes.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Ensure Npgsql returns DateTime as UTC — without this, EF materializes
        // DateTime with Kind=Unspecified from timestamptz columns and save fails.
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        // DbContext — scoped (one per HTTP request)
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing.");

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString));

        // UnitOfWork — same lifetime as DbContext
        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<ApplicationDbContext>());

        // Repositories — scoped
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ITabRepository, TabRepository>();
        services.AddScoped<INoteRepository, NoteRepository>();
        services.AddScoped<ITagRepository, TagRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
        services.AddScoped<ISharedLinkRepository, SharedLinkRepository>();
        services.AddScoped<IUserPreferencesRepository, UserPreferencesRepository>();

        // Services — transient (stateless)
        services.AddTransient<IPasswordHasher, PasswordHasher>();
        services.AddTransient<IEmailService, ConsoleEmailService>();

        // JWT service — singleton is safe (no per-request state)
        services.AddSingleton<IJwtService>(sp =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var secret = config["Jwt:Secret"]
                ?? throw new InvalidOperationException("Jwt:Secret is missing.");
            var issuer = config["Jwt:Issuer"] ?? "notes-api";
            var audience = config["Jwt:Audience"] ?? "notes-client";
            return new JwtService(secret, issuer, audience);
        });

        // OAuth providers — keyed by provider name, resolved by controller
        services.AddHttpClient();
        services.AddKeyedTransient<IOAuthProvider>("google", (sp, _) =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var httpClient = sp.GetRequiredService<IHttpClientFactory>().CreateClient("OAuth");
            return new GoogleOAuthProvider(
                httpClient,
                clientId: config["OAuth:Google:ClientId"] ?? string.Empty,
                clientSecret: config["OAuth:Google:ClientSecret"] ?? string.Empty);
        });
        services.AddKeyedTransient<IOAuthProvider>("github", (sp, _) =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var httpClient = sp.GetRequiredService<IHttpClientFactory>().CreateClient("OAuth");
            return new GitHubOAuthProvider(
                httpClient,
                clientId: config["OAuth:GitHub:ClientId"] ?? string.Empty,
                clientSecret: config["OAuth:GitHub:ClientSecret"] ?? string.Empty);
        });

        return services;
    }
}
