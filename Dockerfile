# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy solution and project files first (layer cache optimization)
COPY notes.slnx .
COPY src/Notes.Domain/Notes.Domain.csproj src/Notes.Domain/
COPY src/Notes.Application/Notes.Application.csproj src/Notes.Application/
COPY src/Notes.Infrastructure/Notes.Infrastructure.csproj src/Notes.Infrastructure/
COPY src/Notes.Api/Notes.Api.csproj src/Notes.Api/

# Restore dependencies (cached layer)
RUN dotnet restore src/Notes.Api/Notes.Api.csproj

# Copy all source code
COPY src/ src/

# Publish production build (re-restore to match SDK version in container)
RUN dotnet publish src/Notes.Api/Notes.Api.csproj \
    -c Release \
    -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Create non-root user for security (Debian-based image uses groupadd/useradd)
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup appuser

COPY --from=build --chown=appuser:appgroup /app/publish .

USER appuser

EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_RUNNING_IN_CONTAINER=true

ENTRYPOINT ["dotnet", "Notes.Api.dll"]
