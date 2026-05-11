using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace Notes.Api.Middleware;

/// <summary>
/// Enforces per-IP rate limiting on /api/auth/* endpoints.
/// Reads limits from IConfiguration:
///   RateLimit:MaxRequests  (default: 5)
///   RateLimit:WindowSeconds (default: 60)
/// Set RateLimit:MaxRequests=0 to disable (used in tests).
/// </summary>
public sealed class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly int _maxRequests;
    private readonly int _windowSeconds;

    // Key: IP address string → (count, windowStart)
    private readonly ConcurrentDictionary<string, (int Count, DateTime WindowStart)> _counters = new();

    public RateLimitingMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _maxRequests = configuration.GetValue<int>("RateLimit:MaxRequests", 5);
        _windowSeconds = configuration.GetValue<int>("RateLimit:WindowSeconds", 60);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 0 means disabled (e.g. in tests)
        if (_maxRequests == 0)
        {
            await _next(context);
            return;
        }

        // Only apply rate limiting to auth and public share endpoints
        if (!context.Request.Path.StartsWithSegments("/api/auth", StringComparison.OrdinalIgnoreCase) &&
            !context.Request.Path.StartsWithSegments("/share", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var now = DateTime.UtcNow;

        var entry = _counters.AddOrUpdate(
            ip,
            _ => (1, now),
            (_, existing) =>
            {
                // Reset window if expired
                if ((now - existing.WindowStart).TotalSeconds >= _windowSeconds)
                    return (1, now);
                return (existing.Count + 1, existing.WindowStart);
            });

        if (entry.Count > _maxRequests)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/json";
            var body = JsonSerializer.Serialize(new { errors = new[] { "Too many requests. Please try again later." } });
            await context.Response.WriteAsync(body);
            return;
        }

        await _next(context);
    }
}
