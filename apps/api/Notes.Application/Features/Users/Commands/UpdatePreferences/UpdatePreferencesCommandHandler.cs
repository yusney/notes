using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Application.Features.Users.Queries.GetUserPreferences;
using Notes.Domain.Entities;

namespace Notes.Application.Features.Users.Commands.UpdatePreferences;

public class UpdatePreferencesCommandHandler : IRequestHandler<UpdatePreferencesCommand, Result<UserPreferencesDto>>
{
    private readonly IUserPreferencesRepository _prefsRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdatePreferencesCommandHandler(
        IUserPreferencesRepository prefsRepository,
        IUnitOfWork unitOfWork)
    {
        _prefsRepository = prefsRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<UserPreferencesDto>> Handle(
        UpdatePreferencesCommand request, CancellationToken cancellationToken)
    {
        var prefs = await _prefsRepository.GetByUserIdAsync(request.UserId, cancellationToken);

        if (prefs is null)
        {
            prefs = UserPreferences.Create(request.UserId);
            prefs.Update(request.Theme, request.SortBy, request.SortOrder);
            await _prefsRepository.AddAsync(prefs, cancellationToken);
        }
        else
        {
            prefs.Update(request.Theme, request.SortBy, request.SortOrder);
            await _prefsRepository.UpdateAsync(prefs, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<UserPreferencesDto>.Ok(
            new UserPreferencesDto(prefs.Theme, prefs.SortBy, prefs.SortOrder));
    }
}
