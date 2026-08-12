using System.Text.RegularExpressions;

namespace Notes.Domain.ValueObjects;

/// <summary>
/// Email value object — immutable, validated, case-normalised.
/// Equality is by value (same address = equal).
/// </summary>
public sealed class Email : IEquatable<Email>
{
    // Simple but sufficient RFC-5322 subset: local@domain.tld
    private static readonly Regex FormatRegex =
        new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public string Value { get; }

    public Email(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Email cannot be empty.", nameof(value));

        var normalised = value.Trim().ToLowerInvariant();

        if (!FormatRegex.IsMatch(normalised))
            throw new ArgumentException($"'{value}' is not a valid email address.", nameof(value));

        Value = normalised;
    }

    // ── Value equality ───────────────────────────────────────────────────────

    public bool Equals(Email? other) => other is not null && Value == other.Value;

    public override bool Equals(object? obj) => obj is Email other && Equals(other);

    public override int GetHashCode() => Value.GetHashCode(StringComparison.Ordinal);

    public override string ToString() => Value;

    public static bool operator ==(Email? left, Email? right) =>
        left is null ? right is null : left.Equals(right);

    public static bool operator !=(Email? left, Email? right) => !(left == right);
}
