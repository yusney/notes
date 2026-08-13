#!/usr/bin/env bash
# Usage: ./scripts/release.sh 0.3.0
# Updates version in all client files, commits, tags, and pushes.

set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Error: version required. Usage: ./scripts/release.sh 0.3.0"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Bumping version to $VERSION..."

# tauri.conf.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT/apps/client/src-tauri/tauri.conf.json"

# package.json (first occurrence = the package version)
sed -i "0,/\"version\": \"[^\"]*\"/s//\"version\": \"$VERSION\"/" "$ROOT/apps/client/package.json"

# Cargo.toml (first occurrence = the package version)
sed -i "0,/^version = \"[^\"]*\"/s//version = \"$VERSION\"/" "$ROOT/apps/client/src-tauri/Cargo.toml"

echo "→ Committing..."
cd "$ROOT"
git add apps/client/src-tauri/tauri.conf.json apps/client/package.json apps/client/src-tauri/Cargo.toml apps/client/src-tauri/Cargo.lock
git commit -m "chore: bump version to $VERSION"

echo "→ Tagging v$VERSION..."
git tag "v$VERSION"

echo "→ Pushing..."
git push origin main
git push origin "v$VERSION"

echo "✓ Release v$VERSION triggered. Check Actions: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
