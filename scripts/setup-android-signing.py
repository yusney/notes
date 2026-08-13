#!/usr/bin/env python3
"""
setup-android-signing.py — idempotently patch apps/client/src-tauri/gen/android/app/build.gradle.kts
to add the release `signingConfigs` block + wire it into the `release` buildType.

Runs in CI before `pnpm tauri android build -- --aab`. Safe to run multiple
times: if the signing config is already present, it no-ops.

The keystore path/password come from a sibling `keystore.properties` file
created by the CI workflow (see .github/workflows/release.yml).

Tauri regenerates `gen/android/` on `tauri android init`, which would
wipe this patch. Running this script after init keeps the signing block
in place across regenerations.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

GRADLE_FILE = Path(__file__).resolve().parent.parent / "apps/client/src-tauri/gen/android/app/build.gradle.kts"

# Markers that identify a build.gradle.kts as already patched.
SIGNING_CONFIG_MARKER = 'create("release") {'
WIRED_RELEASE_MARKER = 'signingConfig = signingConfigs.getByName("release")'


def patch() -> int:
    if not GRADLE_FILE.exists():
        print(f"[setup-android-signing] {GRADLE_FILE} not found; skipping", file=sys.stderr)
        return 0  # gen/ not initialized yet; init step will create it later

    src = GRADLE_FILE.read_text()
    if SIGNING_CONFIG_MARKER in src and WIRED_RELEASE_MARKER in src:
        print("[setup-android-signing] already patched — no-op")
        return 0

    # 1. Add `import java.io.FileInputStream` near the top imports.
    if "import java.io.FileInputStream" not in src:
        # Insert after the first `import` line so the file still has the
        # standard Tauri scaffolding above the new import.
        src = re.sub(
            r"((?:import [^\n]+\n)+)",
            r"\1import java.io.FileInputStream\n",
            src,
            count=1,
        )

    # 2. Inject the signingConfigs block before `buildTypes`.
    signing_block = (
        "    signingConfigs {\n"
        "        create(\"release\") {\n"
        "            val keystorePropertiesFile = rootProject.file(\"keystore.properties\")\n"
        "            val keystoreProperties = Properties()\n"
        "            if (keystorePropertiesFile.exists()) {\n"
        "                keystoreProperties.load(FileInputStream(keystorePropertiesFile))\n"
        "            }\n"
        "            keyAlias = keystoreProperties[\"keyAlias\"] as String\n"
        "            keyPassword = keystoreProperties[\"password\"] as String\n"
        "            storeFile = file(keystoreProperties[\"storeFile\"] as String)\n"
        "            storePassword = keystoreProperties[\"password\"] as String\n"
        "        }\n"
        "    }\n"
        "    "
    )
    if "signingConfigs" not in src:
        src = src.replace("    buildTypes {", signing_block + "buildTypes {", 1)

    # 3. Wire the release buildType to use the release signingConfig.
    if WIRED_RELEASE_MARKER not in src:
        # Add `signingConfig = ...` as the first line inside getByName("release") { ... }.
        src = re.sub(
            r'(getByName\("release"\)\s*\{\s*)',
            r'\1signingConfig = signingConfigs.getByName("release")\n            ',
            src,
            count=1,
        )

    GRADLE_FILE.write_text(src)
    print("[setup-android-signing] build.gradle.kts patched")
    return 0


if __name__ == "__main__":
    sys.exit(patch())
