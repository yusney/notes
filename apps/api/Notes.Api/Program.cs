using System.Globalization;
using System.Net;
using System.Text;
using FluentValidation;
using Ganss.Xss;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
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

// ── Short-lived OAuth state and installed-client exchange code storage ───────
builder.Services.AddMemoryCache();

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

// ── Trusted reverse proxies (Cloudflare) ────────────────────────────────────
// Without KnownIPNetworks below, UseForwardedHeaders would either trust
// X-Forwarded-* from any caller (allowing IP/host/protocol spoofing) or trust
// nothing (its default — KnownProxies/KnownNetworks only include loopback).
// We restrict trust to Cloudflare's published CIDRs so only their edge can
// rewrite client identity.
//
// Update ForwardedHeaders:KnownProxies in appsettings.json when Cloudflare
// publishes new ranges at https://www.cloudflare.com/ips/.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedHost |
        ForwardedHeaders.XForwardedProto;

    var cidrs = builder.Configuration
        .GetSection("ForwardedHeaders:KnownProxies")
        .Get<string[]>() ?? Array.Empty<string>();

    foreach (var cidr in cidrs)
    {
        try
        {
            var (ip, prefix) = ParseCidr(cidr);
            // Fully qualified: ForwardedHeadersOptions also exposes the obsolete
            // Microsoft.AspNetCore.HttpOverrides.IPNetwork via KnownNetworks,
            // so a bare "new IPNetwork(...)" is ambiguous.
            options.KnownIPNetworks.Add(new System.Net.IPNetwork(ip, prefix));
        }
        catch (Exception ex)
        {
            // Don't crash startup on a single malformed entry — surface it on
            // stderr (captured by the container orchestrator) and keep going
            // with the rest of the list.
            Console.Error.WriteLine(
                $"[ForwardedHeaders] Skipping invalid CIDR '{cidr}': {ex.Message}");
        }
    }
});

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:1420",   // Tauri dev
                "tauri://localhost",        // Tauri production (macOS/Linux)
                "https://tauri.localhost",  // Tauri production (Windows)
                "http://tauri.localhost"    // Tauri production (Windows fallback)
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

// ── Razor Pages ───────────────────────────────────────────────────────────────
builder.Services.AddRazorPages();

// ── HTML Sanitizer (shared singleton) ────────────────────────────────────────
builder.Services.AddSingleton<HtmlSanitizer>(_ =>
{
    var sanitizer = new HtmlSanitizer();
    sanitizer.AllowedTags.Clear();
    foreach (var tag in new[]
    {
        "p", "h1", "h2", "h3", "h4", "h5", "h6",
        "strong", "em", "b", "i", "ul", "ol", "li",
        "code", "pre", "blockquote", "a", "br", "hr",
        "span", "div", "table", "thead", "tbody", "tr", "th", "td", "img"
    })
    {
        sanitizer.AllowedTags.Add(tag);
    }
    return sanitizer;
});

var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────────────────────
// UseForwardedHeaders MUST come first. Downstream middleware (rate limiter,
// auth, controllers, OAuth callback URLs) reads HttpContext.Connection's IP,
// Request.Host, and Request.Scheme — those values are only rewritten if this
// runs before them.
app.UseForwardedHeaders();
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

app.UseStaticFiles();
app.MapRazorPages();
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

// Parse a CIDR string like "1.2.3.0/24" or "2400:cb00::/32" into the components
// System.Net.IPNetwork needs. Kept local so it stays near the only consumer.
static (IPAddress Ip, int Prefix) ParseCidr(string cidr)
{
    var parts = cidr.Split('/');
    if (parts.Length != 2)
    {
        throw new FormatException(
            $"Expected 'ip/prefix' (got '{cidr}').");
    }

    var ip = IPAddress.Parse(parts[0].Trim());
    var prefix = int.Parse(parts[1].Trim(), CultureInfo.InvariantCulture);

    var maxPrefix = ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? 32 : 128;
    if (prefix < 0 || prefix > maxPrefix)
    {
        throw new ArgumentOutOfRangeException(
            nameof(cidr), $"Prefix must be 0-{maxPrefix} for this address family.");
    }

    return (ip, prefix);
}

// Make Program accessible for WebApplicationFactory in integration tests
public partial class Program { }
