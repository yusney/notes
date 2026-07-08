using System.Text.Json;

namespace Notes.Api.Middleware;

/// <summary>
/// Catches unhandled exceptions and converts them to structured JSON error responses.
/// </summary>
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, IHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex, env.IsProduction());
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception, bool isProduction)
    {
        var (statusCode, message) = exception switch
        {
            ArgumentException => (StatusCodes.Status400BadRequest, exception.Message),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, exception.Message),
            _ => (StatusCodes.Status500InternalServerError,
                isProduction ? "An unexpected error occurred." : exception.ToString())
        };

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = new { errors = new[] { message } };
        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        return context.Response.WriteAsync(json);
    }
}
