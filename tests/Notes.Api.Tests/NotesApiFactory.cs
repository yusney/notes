using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Notes.Application.Common.Interfaces;
using Notes.Infrastructure.Persistence;

namespace Notes.Api.Tests;

/// <summary>
/// Custom WebApplicationFactory that replaces PostgreSQL with in-memory EF Core
/// and uses a fixed JWT config for tests.
/// </summary>
public class NotesApiFactory : WebApplicationFactory<Program>
{
    // Test JWT config — must match what IJwtService will use
    private const string TestJwtSecret = "notes-super-secret-key-at-least-32-chars-long!";
    private const string TestJwtIssuer = "notes-api";
    private const string TestJwtAudience = "notes-client";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = TestJwtSecret,
                ["Jwt:Issuer"] = TestJwtIssuer,
                ["Jwt:Audience"] = TestJwtAudience,
                // Fake connection string — never used (InMemory replaces it)
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=test_db",
                // Disable rate limiting in tests (0 = disabled)
                ["RateLimit:MaxRequests"] = "0"
            });
        });

        builder.ConfigureServices(services =>
        {
            // Force JWT Bearer middleware to use our test signing key.
            // Program.cs captures jwtSecret in a closure at startup time (before
            // ConfigureAppConfiguration overrides apply), so AddJwtBearer may have
            // picked up a different key. PostConfigure runs AFTER all other setup
            // and overwrites the TokenValidationParameters to guarantee alignment.
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(TestJwtSecret)),
                    ValidateIssuer = true,
                    ValidIssuer = TestJwtIssuer,
                    ValidateAudience = true,
                    ValidAudience = TestJwtAudience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });
            // EF Core uses IDbContextOptionsConfiguration<T> (not DbContextOptions<T>) to store
            // provider config. We must remove ALL of them to avoid "multiple providers" error.
            var optionsConfigType = typeof(Microsoft.EntityFrameworkCore.Infrastructure.IDbContextOptionsConfiguration<ApplicationDbContext>);
            var toRemove = services.Where(d => d.ServiceType == optionsConfigType).ToList();
            foreach (var d in toRemove)
                services.Remove(d);

            // Also remove the explicit DbContextOptions and DbContext descriptors
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<ApplicationDbContext>();

            // Remove stale IUnitOfWork delegate (captured old DbContext registration)
            services.RemoveAll<IUnitOfWork>();

            // Fixed DB name — generated once per factory instance, shared across all requests
            var dbName = $"notes-test-{Guid.NewGuid()}";

            // Register ApplicationDbContext with InMemory — all requests share this DB
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(dbName));

            // Re-wire IUnitOfWork to the new InMemory DbContext
            services.AddScoped<IUnitOfWork>(
                sp => sp.GetRequiredService<ApplicationDbContext>());
        });
    }
}
