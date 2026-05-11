using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.Auth.Commands.RegisterUser;
using Notes.Domain.Entities;
using Notes.Domain.ValueObjects;
using NSubstitute;

namespace Notes.Application.Tests.Features.Auth;

public class RegisterUserCommandHandlerTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly ITabRepository _tabRepo = Substitute.For<ITabRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly IJwtService _jwt = Substitute.For<IJwtService>();
    private readonly IPasswordHasher _hasher = Substitute.For<IPasswordHasher>();

    private RegisterUserCommandHandler CreateHandler() =>
        new(_userRepo, _tabRepo, _uow, _jwt, _hasher);

    [Fact]
    public async Task Handle_NewUser_CreatesUserAndGeneralTabAndReturnsTokens()
    {
        // Arrange
        var cmd = new RegisterUserCommand("alice@example.com", "P@ssword1", "Alice");
        _userRepo.GetByEmailAsync("alice@example.com").Returns((User?)null);
        _hasher.Hash("P@ssword1").Returns("hashed_password");
        _jwt.GenerateTokenPair(Arg.Any<Guid>(), "alice@example.com")
            .Returns(new TokenPair("access.token", "refresh.token"));

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("access.token", result.Value!.AccessToken);
        Assert.Equal("refresh.token", result.Value.RefreshToken);

        // Verify user and tab were saved
        await _userRepo.Received(1).AddAsync(Arg.Is<User>(u =>
            u.Email.Value == "alice@example.com" && u.DisplayName == "Alice"), Arg.Any<CancellationToken>());

        await _tabRepo.Received(1).AddAsync(Arg.Is<Tab>(t =>
            t.Name == "General" && t.Order == 0), Arg.Any<CancellationToken>());

        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ExistingEmail_ReturnsFailResult()
    {
        // Arrange
        var existingUser = User.CreateLocal(Guid.NewGuid(), new Email("alice@example.com"), "Alice", "hash");
        _userRepo.GetByEmailAsync("alice@example.com").Returns(existingUser);

        var cmd = new RegisterUserCommand("alice@example.com", "P@ssword1", "Alice");
        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("already registered", result.Errors[0], StringComparison.OrdinalIgnoreCase);

        // Verify no user was created
        await _userRepo.DidNotReceive().AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_NewUser_GeneralTabBelongsToCreatedUser()
    {
        // Arrange
        var cmd = new RegisterUserCommand("bob@example.com", "P@ssw0rd!", "Bob");
        _userRepo.GetByEmailAsync("bob@example.com").Returns((User?)null);
        _hasher.Hash("P@ssw0rd!").Returns("hashed");

        Guid capturedUserId = Guid.Empty;
        await _userRepo.AddAsync(Arg.Do<User>(u => capturedUserId = u.Id));

        _jwt.GenerateTokenPair(Arg.Any<Guid>(), "bob@example.com")
            .Returns(new TokenPair("at", "rt"));

        var handler = CreateHandler();

        // Act
        await handler.Handle(cmd, CancellationToken.None);

        // Assert — the tab's UserId must match the created user
        await _tabRepo.Received(1).AddAsync(
            Arg.Is<Tab>(t => t.UserId == capturedUserId),
            Arg.Any<CancellationToken>());
    }
}
