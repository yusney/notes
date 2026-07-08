#!/usr/bin/env bash
# scripts/android-dev.sh — launch the Tauri app on the connected Android emulator.
#
# What it does, in order:
#   1. Sets JAVA_HOME / ANDROID_HOME / PATH so the Tauri Android toolchain
#      can find the JDK (Android Studio's bundled JBR) and adb.
#   2. Verifies a device is connected (`adb devices`); if none, exits
#      with a hint to start the emulator first.
#   3. If a previous `pnpm tauri android dev` is still running (PID file
#      at /tmp/tauri-android-dev.pid), brings the app to the foreground
#      via `am start` and tails the dev log — no second instance needed.
#   4. Otherwise launches `pnpm tauri android dev` from desktop/, which
#      builds the Rust shell, runs the Vite dev server, installs the
#      debug APK on the emulator, and starts the app pointed at the
#      dev server. Hot reload is automatic on any .tsx / .ts / .css
#      change; Rust changes trigger an incremental Gradle rebuild.
#
# Usage:  ./scripts/android-dev.sh
# Stop:   Ctrl+C (kills Vite + Gradle + adb cleanly).
#
# Env overrides (all optional):
#   JAVA_HOME             — JDK 17+ install. Defaults to the bundled
#                            Android Studio JBR (version-stable symlink).
#   ANDROID_HOME          — Android SDK root. Defaults to $HOME/Android/Sdk.
#   TAURI_DEV_HOST        — Vite host. Defaults to 0.0.0.0 so the
#                            emulator reaches the dev server via 10.0.2.2.
#   VITE_API_BASE_URL     — Backend URL the app uses. Defaults to
#                            http://10.0.2.2:8080 (emulator loopback to host).
#   TAURI_PID_FILE        — Where the dev-server pid is recorded for the
#                            "already running" short-circuit. Defaults to
#                            /tmp/tauri-android-dev.pid.
#   TAURI_LOG_FILE        — Where the dev-server stdout is captured.
#                            Defaults to /tmp/tauri-android-dev.log.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DESKTOP_DIR="$ROOT/desktop"

# ── Env vars ────────────────────────────────────────────────────────────
export JAVA_HOME="${JAVA_HOME:-/snap/android-studio/current/jbr}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export TAURI_DEV_HOST="${TAURI_DEV_HOST:-0.0.0.0}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://10.0.2.2:8080}"

PID_FILE="${TAURI_PID_FILE:-/tmp/tauri-android-dev.pid}"
LOG_FILE="${TAURI_LOG_FILE:-/tmp/tauri-android-dev.log}"

APP_ID="dev.donduque.notes.debug"
APP_ACTIVITY="dev.donduque.notes.MainActivity"

# Make adb + cmdline-tools + emulator reachable from this shell.
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/emulator:$PATH"

# ── Pre-flight checks ───────────────────────────────────────────────────
command -v adb >/dev/null 2>&1 || {
  echo "✗ adb not found on PATH after setting ANDROID_HOME=$ANDROID_HOME."
  echo "  Install Android SDK platform-tools or point ANDROID_HOME at the right SDK."
  exit 1
}

[ -x "$JAVA_HOME/bin/java" ] || {
  echo "✗ JAVA_HOME=$JAVA_HOME doesn't contain a runnable java binary."
  echo "  Set JAVA_HOME to a JDK 17+ install (e.g. /snap/android-studio/current/jbr)."
  exit 1
}

if ! adb devices | awk 'NR>1 && $2=="device" {found=1} END{exit !found}'; then
  echo "✗ No Android device/emulator connected to adb."
  echo "  Start the emulator (Android Studio → AVD Manager → ▶) and re-run."
  echo ""
  adb devices
  exit 1
fi

DEVICE="$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
echo "→ Device: $DEVICE  (Android $(adb -s "$DEVICE" shell getprop ro.build.version.release), API $(adb -s "$DEVICE" shell getprop ro.build.version.sdk))"

# ── Foreground the app if the dev server is already up ─────────────────
# `pnpm tauri android dev` is a long-running foreground command; if we
# launch a second one it will fail on port :1420 already in use. Detect
# the existing run via the pid file the parent shell writes, just bring
# the app to the foreground, and tail the log so the user can still see
# Vite/Gradle output.
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  RUNNING_PID="$(cat "$PID_FILE")"
  echo "→ Tauri android dev already running (pid $RUNNING_PID)."
  echo "→ Foregrounding $APP_ID (no rebuild needed)."
  adb -s "$DEVICE" shell am start -n "$APP_ID/$APP_ACTIVITY" >/dev/null
  echo ""
  echo "App is in the foreground on $DEVICE."
  echo "Tail the dev log:    tail -f $LOG_FILE"
  echo "Stop the dev server: kill $RUNNING_PID"
  exit 0
fi

# ── Pre-launch the app if a previous run already installed the APK ──────
# `pnpm tauri android dev` will see the APK is already on the device
# and skip the install step. Foregrounding it now gives the user
# immediate feedback while Gradle does its (incremental) build.
if adb -s "$DEVICE" shell pm list packages | grep -q "^package:$APP_ID$"; then
  echo "→ App $APP_ID already installed. Bringing to foreground while Gradle warms up."
  adb -s "$DEVICE" shell am start -n "$APP_ID/$APP_ACTIVITY" >/dev/null
else
  echo "→ App not yet installed. Tauri build will install + launch it."
fi

# ── Tauri build + dev server (foreground) ──────────────────────────────
# Vite dev server + Gradle install + launch + file watcher. Ctrl+C
# stops the whole chain cleanly.
cd "$DESKTOP_DIR"
echo "→ Starting tauri android dev (first build 1-2 min, hot reload after)..."
echo ""
exec pnpm tauri android dev