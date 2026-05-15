using System.Text;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Notes.Application;
using Notes.Api.Middleware;
using Notes.Infrastructure;
using Notes.Infrastructure.Persistence;
using Scalar.AspNetCore;

// Disable the default JWT claim type mapping so that "sub", "email", etc.
// arrive in User.Claims exactly as they are in the token — no remapping to
// WS-Federation URNs (e.g. "sub" → NameIdentifier).
System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var builder = WebApplication.CreateBuilder(args);

// ── Application layer (MediatR + FluentValidation) ──────────────────────────
builder.Services.AddApplication();

// ── Infrastructure layer (DbContext + repos + services) ──────────────────────
builder.Services.AddInfrastructure(builder.Configuration);

// ── JWT Bearer Authentication (Task 5.11) ────────────────────────────────────
// Configure JWT Bearer using IConfigureOptions<JwtBearerOptions> so that
// the signing key is resolved from IConfiguration AT REQUEST TIME — not
// captured in a closure at startup. This lets WebApplicationFactory override
// the config and have the middleware pick up the test values correctly.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IConfiguration>((options, config) =>
    {
        var secret = config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is missing.");
        var issuer = config["Jwt:Issuer"] ?? "notes-api";
        var audience = config["Jwt:Audience"] ?? "notes-client";

        // Disable automatic claim type mapping so "sub" stays "sub" (not
        // remapped to ClaimTypes.NameIdentifier / WS-Federation URI).
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:1420",  // Tauri dev
                "tauri://localhost",       // Tauri production
                "https://tauri.localhost"  // Tauri production (some platforms)
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ── Health checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ── Controllers ───────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
        // Serialize enums as strings ("light"/"dark") instead of integers (0/1/2)
        // Allow case-insensitive deserialization ("dark" ↔ Theme.Dark)
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter(
                System.Text.Json.JsonNamingPolicy.CamelCase, allowIntegerValues: true));
    });
builder.Services.AddOpenApi();

var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────────────────────
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<RateLimitingMiddleware>();
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.Title = "Notes API";
        options.Theme = ScalarTheme.DeepSpace;
        options.DefaultHttpClient = new(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

// ── Auto-migrate on startup ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (db.Database.IsRelational())
    {
        logger.LogInformation("Checking database connection...");
        var canConnect = await db.Database.CanConnectAsync();
        if (!canConnect)
        {
            logger.LogError("Cannot connect to the database. Check the connection string.");
            throw new InvalidOperationException("Database is unreachable on startup.");
        }
        logger.LogInformation("Database connection OK. Running pending migrations...");
        await db.Database.MigrateAsync();
        logger.LogInformation("Migrations applied successfully.");
    }
}

app.Run();

// Make Program accessible for WebApplicationFactory in integration tests
public partial class Program { }
