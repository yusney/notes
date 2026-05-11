using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Notes.Api.Middleware;

namespace Notes.Api.Tests.Middleware;

public class RateLimitingMiddlewareTests
{
    private static IConfiguration BuildConfig(int maxRequests, int windowSeconds = 60)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimit:MaxRequests"] = maxRequests.ToString(),
                ["RateLimit:WindowSeconds"] = windowSeconds.ToString()
            })
            .Build();
    }

    private static DefaultHttpContext BuildAuthContext(string ip = "10.0.0.1")
    {
        var ctx = new DefaultHttpContext();
        ctx.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(ip);
        ctx.Request.Path = "/api/auth/login";
        ctx.Response.Body = new System.IO.MemoryStream();
        return ctx;
    }

    private static DefaultHttpContext BuildNonAuthContext()
    {
        var ctx = new DefaultHttpContext();
        ctx.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("10.0.0.99");
        ctx.Request.Path = "/api/notes";
        ctx.Response.Body = new System.IO.MemoryStream();
        return ctx;
    }

    [Fact]
    public async Task InvokeAsync_RequestsUnderLimit_AllAllowed()
    {
        var limiter = new RateLimitingMiddleware(_ => Task.CompletedTask, BuildConfig(maxRequests: 5));

        for (int i = 0; i < 5; i++)
        {
            var ctx = BuildAuthContext();
            await limiter.InvokeAsync(ctx);
            ctx.Response.StatusCode.Should().Be(200, $"request {i + 1} should be allowed");
        }
    }

    [Fact]
    public async Task InvokeAsync_ExceedsLimit_Returns429()
    {
        var limiter = new RateLimitingMiddleware(_ => Task.CompletedTask, BuildConfig(maxRequests: 3));
        var ip = "10.0.0.2";

        for (int i = 0; i < 3; i++)
            await limiter.InvokeAsync(BuildAuthContext(ip));

        var blocked = BuildAuthContext(ip);
        await limiter.InvokeAsync(blocked);

        blocked.Response.StatusCode.Should().Be(429);
    }

    [Fact]
    public async Task InvokeAsync_NonAuthEndpoint_NotRateLimited()
    {
        var limiter = new RateLimitingMiddleware(_ => Task.CompletedTask, BuildConfig(maxRequests: 1));

        for (int i = 0; i < 5; i++)
        {
            var ctx = BuildNonAuthContext();
            await limiter.InvokeAsync(ctx);
            ctx.Response.StatusCode.Should().Be(200, $"non-auth request {i + 1} should never be rate-limited");
        }
    }

    [Fact]
    public async Task InvokeAsync_DifferentIPs_TrackedSeparately()
    {
        var limiter = new RateLimitingMiddleware(_ => Task.CompletedTask, BuildConfig(maxRequests: 2));

        await limiter.InvokeAsync(BuildAuthContext("192.168.1.1"));
        await limiter.InvokeAsync(BuildAuthContext("192.168.1.1"));
        var blockedA = BuildAuthContext("192.168.1.1");
        await limiter.InvokeAsync(blockedA);
        blockedA.Response.StatusCode.Should().Be(429);

        var ctxB = BuildAuthContext("192.168.1.2");
        await limiter.InvokeAsync(ctxB);
        ctxB.Response.StatusCode.Should().Be(200);
    }
}
