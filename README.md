# Notes — Gestor de Conocimiento Personal

A personal knowledge management system with a web API backend (ASP.NET Core) and a cross-platform desktop app (Tauri + React).

## Architecture

```
notes/
├── src/                     # .NET backend (Clean Architecture)
│   ├── Notes.Api/           # ASP.NET Core Web API
│   ├── Notes.Application/   # Use cases (MediatR + CQRS)
│   ├── Notes.Domain/        # Domain entities & interfaces
│   └── Notes.Infrastructure/# EF Core + PostgreSQL + services
├── desktop/                 # Tauri v2 desktop app
│   ├── src/                 # React + TypeScript frontend
│   └── src-tauri/           # Rust/Tauri shell
├── tests/                   # Integration & E2E tests
├── Dockerfile               # Multi-stage Docker build for API
├── docker-compose.yml       # Local dev: PostgreSQL + API
└── .env.example             # Environment variable template
```

## Prerequisites

| Tool | Version |
|------|---------|
| .NET SDK | 10.0+ |
| Node.js | 22+ |
| pnpm | 10+ |
| Rust | stable (for desktop build) |
| Docker & Docker Compose | 24+ |
| PostgreSQL | 16 (via Docker) |

## Quick Start (Local Development)

### 1. Clone and configure environment

```bash
git clone https://github.com/your-org/notes.git
cd notes
cp .env.example .env
# Edit .env and set a strong Jwt__Secret (at least 32 chars)
```

### 2. Start backend + database with Docker Compose

```bash
docker-compose up -d
# PostgreSQL: localhost:5432
# API:        http://localhost:8080
# Health:     http://localhost:8080/health
```

### 3. Run backend tests

```bash
dotnet test notes.slnx
```

### 4. Run desktop app (development)

```bash
cd desktop
pnpm install
pnpm tauri dev
```

### 5. Run frontend tests

```bash
cd desktop
pnpm exec vitest run
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `notes_db` |
| `POSTGRES_USER` | Database user | `notes_user` |
| `POSTGRES_PASSWORD` | Database password | **REQUIRED** |
| `Jwt__Secret` | JWT signing key (≥32 chars) | **REQUIRED** |
| `Jwt__Issuer` | JWT issuer | `notes-api` |
| `Jwt__Audience` | JWT audience | `notes-client` |
| `VITE_API_BASE_URL` | API URL for desktop app | `http://localhost:8080` |

> ⚠️ **Never commit `.env` to git.** It is already in `.gitignore`.

## Docker

### Build the API image

```bash
docker build -t notes-api .
```

### Run standalone container

```bash
docker run -p 8080:8080 \
  -e ConnectionStrings__DefaultConnection="Host=<db-host>;Port=5432;Database=notes_db;Username=notes_user;Password=<password>" \
  -e Jwt__Secret="<your-secret-at-least-32-chars>" \
  notes-api
```

### Verify health

```bash
curl http://localhost:8080/health
# → Healthy
```

## Desktop Build

### Linux (.AppImage, .deb)

```bash
cd desktop
pnpm install
VITE_API_BASE_URL=https://api.your-domain.com pnpm tauri build
```

Artifacts: `desktop/src-tauri/target/release/bundle/`

### Windows (.msi, .exe)

Cross-compilation requires Windows runner or a Windows machine.

```bash
VITE_API_BASE_URL=https://api.your-domain.com pnpm tauri build
```

### macOS (.dmg)

Requires macOS runner (code signing recommended for distribution).

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:

| Job | What it does |
|-----|-------------|
| `backend` | Restore → Build → Test (.NET) |
| `frontend` | Type check → Unit tests → Build |
| `docker-build` | Builds and validates Docker image |
| `tauri-build` | Builds Linux AppImage + .deb artifacts |

## Deployment (Dokploy + VPS)

1. Push to `main` branch → CI passes
2. Dokploy detects new image or webhook triggers deploy
3. Docker Compose on VPS pulls new `notes-api` image
4. Zero-downtime rolling restart

Set production secrets in Dokploy environment panel (never in the repository).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET/POST | `/api/tabs` | JWT | Manage tabs |
| GET/POST | `/api/notes` | JWT | Manage notes |
| GET/POST | `/api/tags` | JWT | Manage tags |

Full OpenAPI docs available at `http://localhost:8080/openapi/v1.json` in Development mode.

## License

MIT
