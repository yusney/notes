using MediatR;
using Notes.Application.Common.Models;
using Notes.Application.Features.SharedLinks.Dtos;

namespace Notes.Application.Features.SharedLinks.Queries.GetSharedNoteByToken;

public record GetSharedNoteByTokenQuery(string Token) : IRequest<Result<SharedNoteDto>>;
