# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Backend API Docs

The desktop app talks to the Notes API defined in `../src/Notes.Api`. When debugging request/response payloads, the API exposes its schema via OpenAPI in `Development` mode only:

| URL | What you get |
|---|---|
| `http://localhost:<puerto>/scalar/v1` | Interactive UI to browse endpoints and fire requests |
| `http://localhost:<puerto>/openapi/v1.json` | Raw OpenAPI 3 spec (code generators, Postman import) |

Default ports: `8080` if API runs via `docker-compose`, `5000` if via `dotnet run`. See the root [README.md](../README.md#api-documentation) for full details.
