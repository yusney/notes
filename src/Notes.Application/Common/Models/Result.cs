namespace Notes.Application.Common.Models;

/// <summary>
/// Discriminated union for operation results: Ok(T) or Error(string[]).
/// Used consistently across all Application layer handlers.
/// </summary>
public sealed class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string[] Errors { get; }

    private Result(bool isSuccess, T? value, string[] errors)
    {
        IsSuccess = isSuccess;
        Value = value;
        Errors = errors;
    }

    public static Result<T> Ok(T value) => new(true, value, []);
    public static Result<T> Fail(params string[] errors) => new(false, default, errors);
    public static Result<T> Fail(string error) => new(false, default, [error]);
}

/// <summary>
/// Non-generic Result for void operations.
/// </summary>
public sealed class Result
{
    public bool IsSuccess { get; }
    public string[] Errors { get; }

    private Result(bool isSuccess, string[] errors)
    {
        IsSuccess = isSuccess;
        Errors = errors;
    }

    public static Result Ok() => new(true, []);
    public static Result Fail(params string[] errors) => new(false, errors);
    public static Result Fail(string error) => new(false, [error]);
}
