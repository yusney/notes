#!/usr/bin/env python3
"""
patch-android-deep-link.py — injects an OAuth callback intent-filter
into apps/client/src-tauri/gen/android/app/src/main/AndroidManifest.xml
for the `notes://` custom-scheme + `https://auth.callback/` Universal
Link host pair.

Why this exists:

The Tauri 2.6 deep-link plugin (tauri-plugin-deep-link v2.6.1) does not
emit a mobile intent-filter for custom schemes out of the box:

  - `mobile: [{ host: "auth.callback" }]`     → only `http`/`https`
  - `mobile: ["notes://auth.callback"]`        → parse error (expects
                                                   AssociatedDomain)
  - `mobile: [{ scheme: "notes", host: "..." }]` → unknown field

Rather than fight the plugin, this script injects the full
intent-filter directly into AndroidManifest.xml after the build runs.
It's idempotent: if the exact `<data android:scheme="notes" />` is
present in the OAuth-callback intent-filter, it no-ops.

Run locally:

    python3 scripts/patch-android-deep-link.py

Run in CI (after `tauri android build --debug`):

    - name: Patch OAuth callback deep-link intent-filter
      working-directory: apps/client
      run: python3 ../../scripts/patch-android-deep-link.py
"""
from __future__ import annotations

import sys
from pathlib import Path

MANIFEST = (
    Path(__file__).resolve().parent.parent
    / "apps/client/src-tauri/gen/android/app/src/main/AndroidManifest.xml"
)

CUSTOM_SCHEME = "notes"
TARGET_HOST = "auth.callback"

# Self-contained intent-filter block. The host matches the Universal
# Link host the Notes API redirects to. The custom scheme is what the
# mobile app actually receives on the device.
INTENT_FILTER = (
    '            <!-- OAUTH CALLBACK DEEP LINK. PATCHED BY '
    'scripts/patch-android-deep-link.py. -->\n'
    '            <intent-filter android:autoVerify="true">\n'
    '                <action android:name="android.intent.action.VIEW" />\n'
    '                <category android:name="android.intent.category.DEFAULT" />\n'
    '                <category android:name="android.intent.category.BROWSABLE" />\n'
    '                <data android:scheme="https" />\n'
    '                <data android:scheme="http" />\n'
    f'                <data android:scheme="{CUSTOM_SCHEME}" />\n'
    f'                <data android:host="{TARGET_HOST}" />\n'
    "            </intent-filter>\n"
)

# Marker we insert at the top of the patch block so subsequent runs can
# detect an existing patch without having to regex the whole file.
PATCH_MARKER = "PATCHED BY scripts/patch-android-deep-link.py"


def patch() -> int:
    if not MANIFEST.exists():
        print(f"[patch-deep-link] {MANIFEST} not found; skipping", file=sys.stderr)
        return 0

    src = MANIFEST.read_text()

    # Already patched — no-op.
    if PATCH_MARKER in src:
        print("[patch-deep-link] already patched — no-op")
        return 0

    # Insert immediately after the existing LAUNCHER intent-filter (which
    # always ends with `</intent-filter>` followed by the "DEEP LINK
    # PLUGIN" comment block). The LAUNCHER filter is the first
    # <intent-filter> block in the file, so we anchor on that.
    # We look for the LAUNCHER category which only appears in the
    # main launcher intent-filter.
    anchor = '                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />\n'
    end_of_anchor_filter = '            </intent-filter>\n'

    launcher_end_idx = src.find(anchor)
    if launcher_end_idx < 0:
        print(
            "[patch-deep-link] no LAUNCHER intent-filter found in "
            f"{MANIFEST}; run `pnpm tauri android init` first",
            file=sys.stderr,
        )
        return 1

    insertion_point = src.find(end_of_anchor_filter, launcher_end_idx)
    if insertion_point < 0:
        print(
            "[patch-deep-link] no `</intent-filter>` close found after "
            f"LAUNCHER block in {MANIFEST}; unexpected manifest shape",
            file=sys.stderr,
        )
        return 1

    # Insert AFTER the closing `</intent-filter>` (advance past the close).
    cut = insertion_point + len(end_of_anchor_filter)
    new_src = src[:cut] + INTENT_FILTER + src[cut:]
    MANIFEST.write_text(new_src)
    print(
        f"[patch-deep-link] injected {CUSTOM_SCHEME}://{TARGET_HOST} "
        f"deep-link intent-filter"
    )
    return 0


if __name__ == "__main__":
    sys.exit(patch())
