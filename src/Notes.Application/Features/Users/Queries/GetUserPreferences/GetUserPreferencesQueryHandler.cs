using MediatR;
using Notes.Application.Common.Interfaces;
using Notes.Application.Common.Models;
using Notes.Domain.Entities;

namespace Notes.Application.Features.Users.Queries.GetUserPreferences;

public class GetUserPreferencesQueryHandler : IRequestHandler<GetUserPreferencesQuery, Result<UserPreferencesDto>>
{
    private readonly IUserPreferencesRepository _prefsRepository;
    private readonly IUnitOfWork _unitOfWork;

    public GetUserPreferencesQueryHandler(
        IUserPreferencesRepository prefsRepository,
        IUnitOfWork unitOfWork)
    {
        _prefsRepository = prefsRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<UserPreferencesDto>> Handle(
        GetUserPreferencesQuery request, CancellationToken cancellationToken)
    {
        var prefs = await _prefsRepository.GetByUserIdAsync(request.UserId, cancellationToken);

        if (prefs is null)
        {
            prefs = UserPreferences.Create(request.UserId);
            await _prefsRepository.AddAsync(prefs, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return Result<UserPreferencesDto>.Ok(
            new UserPreferencesDto(prefs.Theme, prefs.SortBy, prefs.SortOrder));
    }
}
