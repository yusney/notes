# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Backend API Docs

The client app talks to the Notes API defined in `../api/Notes.Api`. When debugging request/response payloads, the API exposes its schema via OpenAPI in `Development` mode only:

| URL | What you get |
|---|---|
| `http://localhost:<puerto>/scalar/v1` | Interactive UI to browse endpoints and fire requests |
| `http://localhost:<puerto>/openapi/v1.json` | Raw OpenAPI 3 spec (code generators, Postman import) |

Default ports: `8080` if API runs via `docker-compose`, `5000` if via `dotnet run`. See the root [README.md](../../README.md#api-documentation) for full details.

## Build for Android

Same Tauri v2 project builds the Android target (`minSdkVersion: 30`, `versionCode: 1`, `productName: Notes`, `identifier: dev.donduque.notes` — defined in `src-tauri/tauri.conf.json` under `bundle.android`). The Android target is generated on first build via `pnpm tauri android init` (output at `apps/client/src-tauri/gen/android/`).

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| JDK | 17+ (`JAVA_HOME`) | Tauri v2 requires JDK 17. `brew install --cask temurin@17` on macOS; `sdkman` / `apt install openjdk-17-jdk` on Linux. |
| Android SDK (`ANDROID_HOME`) | API 34 platform + build-tools 34.0.0+ | Install via Android Studio's SDK Manager or `sdkmanager` from the command-line tools. |
| Android NDK (`NDK_HOME`) | r25c or later (26.x recommended) | Required for `aarch64-linux-android` Rust cross-compilation. Install via SDK Manager → SDK Tools → "NDK (Side by side)". |
| Rustup target | `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android` | Add with `rustup target add <target>`. Tauri picks the target matching the connected device / emulator. |
| Rust crate cache | populated | `cargo fetch` after adding the targets above. |

### Common setup (Linux / macOS)

```bash
# 1. Install the Android targets Rust needs to cross-compile to.
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android

# 2. Export Android env vars (point to your SDK install). Add these to
#    your shell profile so they survive reboots.
export ANDROID_HOME="$HOME/Android/Sdk"     # Linux
# export ANDROID_HOME="$HOME/Library/Android/sdk"   # macOS
export NDK_HOME="$ANDROID_HOME/ndk/26.1.10909125"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

### Dev (live-reload on a connected device / emulator)

```bash
cd apps/client
pnpm install
pnpm tauri android dev
```

Launches the app on the first available Android device or emulator with Vite HMR wired to the apps/client/ frontend. The same `VITE_API_BASE_URL` env var the client build uses (see root [README.md](../README.md#environment-variables)) is respected.

### Build (signed APK / AAB)

```bash
cd apps/client
pnpm tauri android build --debug    # debug APK — signed with the auto-generated debug keystore
pnpm tauri android build            # release AAB — requires you to provide a release keystore via src-tauri/gen/android/app/key.properties
```

After a successful debug build, the APK lands at:

```
apps/client/src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected device with `adb install -r <path>` (after `adb` is on `PATH` — it lives under `$ANDROID_HOME/platform-tools/`).

### Smoke check (CI / cold-boot)

A Playwright mobile smoke spec at `apps/client/e2e/mobile-smoke.spec.ts` exercises the login round-trip at a 360x640 viewport (S4 / REQ-AUTH-01). Run the full E2E suite on a Tauri WebView with:

```bash
cd apps/client
pnpm test:e2e
```

The spec gracefully skips outside a Tauri runtime (browser-mode `vite dev`); CI image runs that build the APK execute it for real.
