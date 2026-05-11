using MediatR;
using Notes.Application.Common.Models;
using Notes.Application.Features.SharedLinks.Dtos;

namespace Notes.Application.Features.SharedLinks.Queries.GetSharedLinks;

public record GetSharedLinksQuery(
    Guid UserId,
    Guid? NoteId) : IRequest<Result<List<SharedLinkDto>>>;
