using Notes.Application.Common.Interfaces;
using Notes.Application.Features.Auth.Commands.OAuthLogin;
using Notes.Application.Features.Auth.Commands.RegisterUser;
using Notes.Domain.Entities;
using Notes.Domain.Enums;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Features.Auth;

public class OAuthLoginCommandHandlerTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly ITabRepository _tabRepo = Substitute.For<ITabRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IJwtService _jwt = Substitute.For<IJwtService>();

    private OAuthLoginCommandHandler CreateHandler() =>
        new(_userRepo, _tabRepo, _uow, _jwt);

    [Fact]
    public async Task Handle_NewOAuthUser_CreatesUserAndReturnsTokens()
    {
        // Arrange
        var cmd = new OAuthLoginCommand(
            Provider: AuthProvider.Google,
            ProviderUserId: "google-123",
            Email: "alice@gmail.com",
            DisplayName: "Alice");

        _userRepo.GetByEmailAsync("alice@gmail.com").Returns((User?)null);
        _userRepo.GetByProviderAsync(AuthProvider.Google, "google-123").Returns((User?)null);
        _jwt.GenerateTokenPair(Arg.Any<Guid>(), "alice@gmail.com")
            .Returns(new TokenPair("access.token", "refresh.token"));

        // Act
        var result = await CreateHandler().Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("access.token", result.Value!.AccessToken);
        await _userRepo.Received(1).AddAsync(
            Arg.Is<User>(u => u.Email.Value == "alice@gmail.com" && u.Provider == AuthProvider.Google),
            Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ExistingOAuthUser_ReturnsTokensWithoutCreating()
    {
        // Triangulation: returning user
        var userId = Guid.NewGuid();
        var existing = User.CreateOAuth(userId, new Email("alice@gmail.com"), "Alice", AuthProvider.Google, "google-123");

        _userRepo.GetByProviderAsync(AuthProvider.Google, "google-123").Returns(existing);
        _jwt.GenerateTokenPair(userId, "alice@gmail.com")
            .Returns(new TokenPair("at2", "rt2"));

        var cmd = new OAuthLoginCommand(AuthProvider.Google, "google-123", "alice@gmail.com", "Alice");
        var result = await CreateHandler().Handle(cmd, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("at2", result.Value!.AccessToken);
        await _userRepo.DidNotReceive().AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_LocalUserWithSameEmail_ReturnsFailResult()
    {
        // Triangulation: reject OAuth login if a Local account has the same email
        var userId = Guid.NewGuid();
        var localUser = User.CreateLocal(userId, new Email("alice@example.com"), "Alice", "hash");

        _userRepo.GetByProviderAsync(AuthProvider.Google, "google-456").Returns((User?)null);
        _userRepo.GetByEmailAsync("alice@example.com").Returns(localUser);

        var cmd = new OAuthLoginCommand(AuthProvider.Google, "google-456", "alice@example.com", "Alice");
        var result = await CreateHandler().Handle(cmd, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("already registered", result.Errors[0], StringComparison.OrdinalIgnoreCase);
        await _userRepo.DidNotReceive().AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
    }
}
