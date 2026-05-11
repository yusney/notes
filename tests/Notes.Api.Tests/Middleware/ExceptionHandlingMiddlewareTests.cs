using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using NSubstitute;
using Notes.Api.Middleware;

namespace Notes.Api.Tests.Middleware;

public class ExceptionHandlingMiddlewareTests
{
    private static IHostEnvironment DevEnv()
    {
        var env = Substitute.For<IHostEnvironment>();
        env.EnvironmentName.Returns("Development");
        return env;
    }

    [Fact]
    public async Task InvokeAsync_NoException_CallsNextAndReturns200()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new System.IO.MemoryStream();

        RequestDelegate next = _ => Task.CompletedTask;
        var sut = new ExceptionHandlingMiddleware(next, DevEnv());

        await sut.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task InvokeAsync_GenericException_Returns500WithJsonBody()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new System.IO.MemoryStream();

        RequestDelegate next = _ => throw new Exception("Something broke");
        var sut = new ExceptionHandlingMiddleware(next, DevEnv());

        await sut.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(500);
        context.Response.ContentType.Should().StartWith("application/json");

        context.Response.Body.Seek(0, System.IO.SeekOrigin.Begin);
        var body = await new System.IO.StreamReader(context.Response.Body).ReadToEndAsync();
        var doc = JsonDocument.Parse(body);
        doc.RootElement.GetProperty("errors").EnumerateArray().Should().NotBeEmpty();
    }

    [Fact]
    public async Task InvokeAsync_ArgumentException_Returns400()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new System.IO.MemoryStream();

        RequestDelegate next = _ => throw new ArgumentException("bad input");
        var sut = new ExceptionHandlingMiddleware(next, DevEnv());

        await sut.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task InvokeAsync_UnauthorizedAccessException_Returns401()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new System.IO.MemoryStream();

        RequestDelegate next = _ => throw new UnauthorizedAccessException("forbidden");
        var sut = new ExceptionHandlingMiddleware(next, DevEnv());

        await sut.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(401);
    }

    [Fact]
    public async Task InvokeAsync_Exception_ResponseBodyIsValidJsonWithErrorsArray()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new System.IO.MemoryStream();

        RequestDelegate next = _ => throw new InvalidOperationException("state error");
        var sut = new ExceptionHandlingMiddleware(next, DevEnv());

        await sut.InvokeAsync(context);

        context.Response.Body.Seek(0, System.IO.SeekOrigin.Begin);
        var body = await new System.IO.StreamReader(context.Response.Body).ReadToEndAsync();
        var doc = JsonDocument.Parse(body);

        doc.RootElement.TryGetProperty("errors", out var errors).Should().BeTrue();
        errors.GetArrayLength().Should().BeGreaterThan(0);
    }
}
