# Releasing Notes

End-to-end release pipeline for Notes (Tauri desktop + Android). Covers the
one-time setup, the CI build pipeline, and the manual Google Play Console
steps for the first production release.

## Table of contents

1. [One-time setup](#one-time-setup)
   - [Generate the Android upload keystore](#generate-the-android-upload-keystore)
   - [Configure GitHub repository secrets](#configure-github-repository-secrets)
   - [Create the Google Play Developer account](#create-the-google-play-developer-account)
   - [Register the app on Play Console](#register-the-app-on-play-console)
2. [Cutting a release](#cutting-a-release)
3. [First release to Google Play](#first-release-to-google-play)
4. [Subsequent releases](#subsequent-releases)
5. [Rollback procedure](#rollback-procedure)
6. [Troubleshooting](#troubleshooting)
7. [Future improvements](#future-improvements)
8. [Security notes](#security-notes)

---

## One-time setup

These steps are required the **first time** only. They establish the
upload keystore, the Google Play Console listing, and the GitHub Secrets
the CI workflow reads.

### Generate the Android upload keystore

The "upload key" is what signs your Android App Bundle (AAB) before
upload. Google Play re-signs the bundle with its own "app signing key"
when you enroll in Play App Signing — your upload key is what authorizes
future updates.

⚠️ **The keystore file is the only thing that can sign updates for this
app on Google Play.** Store it in **two** secure locations (a password
manager like 1Password + an encrypted USB drive). Losing it means
losing the Play Store listing.

Generate the keystore on Linux or macOS:

```bash
# pick a strong password and remember it — you'll set ANDROID_KEY_PASSWORD to it
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

The interactive prompts ask for the keystore password, your name, the
organization, etc. Use distinct passwords for the keystore and the
key (you can press Enter to use the same password for both).

If `keytool` is not in your `PATH`, run it from the Android Studio
JDK that ships with every install:

```bash
# Linux (snap)
/snap/android-studio/current/jbr/bin/keytool ...args

# macOS
/Applications/Android\ Studio.app/Contents/jbr/Contents/Home/bin/keytool ...args
```

Verify the keystore:

```bash
keytool -list -v -keystore ~/upload-keystore.jks
# should show:
#   Alias name: upload
#   Creation date: ...
#   SHA1: ...  ← this is your upload key fingerprint
```

### Configure GitHub repository secrets

The CI workflow `.github/workflows/release.yml` reads three secrets from
`Settings → Secrets and variables → Actions → New repository secret`.

| Secret | Value | How to obtain |
|---|---|---|
| `ANDROID_KEY_ALIAS` | `upload` | The alias you passed to `keytool -genkey` |
| `ANDROID_KEY_PASSWORD` | _(your keystore password)_ | The password you set in `keytool` |
| `ANDROID_KEY_BASE64` | `base64 -i ~/upload-keystore.jks` | The base64 encoding of the keystore file |

Generate the base64 value (macOS / Linux):

```bash
# macOS — copies to clipboard
base64 -i ~/upload-keystore.jks | pbcopy

# Linux — prints to stdout, copy by hand
base64 -i ~/upload-keystore.jks
```

After saving the three secrets, the CI job `build-android` will be
able to reconstruct `keystore.properties` from them on every release
push.

### Create the Google Play Developer account

The Play Console requires a one-time $25 USD registration fee:

1. Go to <https://play.google.com/console/developers> and sign in with the
   Google account that will own the listing.
2. Accept the Developer Distribution Agreement.
3. Pay the $25 USD registration fee.
4. Complete the developer profile (name, email, phone).

### Register the app on Play Console

1. In Play Console → **All apps** → **Create app**.
2. **App name**: `Notes` (or your final product name).
3. **Default language**: Spanish (or your primary market).
4. **App or game**: App.
5. **Free or paid**: Free (matches the project's MIT license).
6. Accept the declarations and click **Create app**.

You'll land on the **App dashboard**. The following tasks must be completed
before the first upload:

- **Set up your app** → **App access** (declare which users can access: typically "All functionality is available without special access")
- **Set up your app** → **Ads** (declare "No, my app does not contain ads")
- **Set up your app** → **App content**:
  - **Privacy policy**: required for any app with sensitive permissions or
    network access — point it at `https://donduque.dev/notes/privacy` (or
    wherever you host it). Required even if you collect no data.
  - **App access**: confirm "All functionality is available without
    special access".
  - **Ads**: confirm "No, my app does not contain ads".
  - **Content rating**: complete the IARC questionnaire — for a personal
    knowledge manager this is typically "Everyone" with all "no"
    answers.
  - **Target audience**: 18+, "Designed for general audiences" or
    "Designed for children" depending on your intent.
  - **Data safety**: complete the form truthfully. Notes uses:
    - Account info (email, profile) — required, encrypted in transit
    - App activity (notes content) — required, encrypted in transit,
      user can request deletion
    - App info and performance (crash logs) — optional
  - **Government apps**: declare "This app is not a government app".
  - **Financial features**: "This app does not provide any financial
    features".
  - **Health apps**: declare "This app is not a health app".
- **Grow** → **Store presence** → **Main store listing**:
  - Short description (80 chars)
  - Full description (4000 chars)
  - App icon (512×512 PNG — Tauri's default icon is in
    `apps/client/src-tauri/icons/`)
  - Feature graphic (1024×500 PNG)
  - Phone screenshots (minimum 2, 16:9 or 9:16, 320-3840 px)
- **Release** → **Production** (this is where the first upload goes)

---

## Cutting a release

The release pipeline is fully automated once the setup is done.

### 1. Bump the version

Two version fields must move together:

- `apps/client/package.json` → `version` (for frontend consistency)
- `apps/client/src-tauri/Cargo.toml` → `version` (the source of truth for
  the bundle metadata)
- `apps/client/src-tauri/tauri.conf.json` → `version` (must match Cargo)

`versionCode` (Android-only, in `tauri.conf.json > bundle > android`) does
**not** need to be bumped manually — Tauri derives it from
`major*1000000 + minor*1000 + patch` automatically
(`0.3.7 → 1003007`). If you need a sequential scheme (e.g. CI
re-runs), override `bundle.android.versionCode` explicitly.

### 2. Commit and tag

```bash
git add apps/client/package.json apps/client/src-tauri/Cargo.toml apps/client/src-tauri/tauri.conf.json
git commit -m "chore(release): bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main vX.Y.Z
```

`main` is the target branch (PR #16 is the latest merge). `vX.Y.Z` is the
trigger for both `release.yml` and the AAB build inside it.

### 3. Watch the CI

`.github/workflows/release.yml` runs four jobs:

- `test-backend` — .NET unit tests
- `test-frontend` — vitest + tsc
- `build-tauri` (matrix: ubuntu / windows / macos) — desktop installers
  via `tauri-apps/tauri-action@v0`
- `build-android` — signed release AAB via `pnpm tauri android build --aab`

The `build-android` job:

1. Sets up JDK 17, Android SDK 34, build-tools 34.0.0, NDK 26.1, Rust
   Android targets.
2. Runs `pnpm tauri android init --ci` (idempotent — no-op if
   `gen/android/` already exists).
3. Applies the release signing config to
   `apps/client/src-tauri/gen/android/app/build.gradle.kts` via
   `python3 ../../scripts/setup-android-signing.py` (idempotent).
4. Materialises `keystore.properties` from the three GitHub Secrets.
5. Builds the universal AAB.
6. Uploads it as a workflow artifact (`notes-android-release-aab`,
   90-day retention).
7. Attaches it to the **same** GitHub Release draft that
   `tauri-action@v0` creates, via `gh release upload`.

Total run time: 6-10 min on `ubuntu-latest` for the Android job.

### 4. Find the AAB

Once CI is green:

- **GitHub Actions artifacts**: download
  `notes-android-release-aab.zip` from the workflow run
- **GitHub Releases draft**: the `.aab` is attached to the draft release
  for tag `vX.Y.Z`

---

## First release to Google Play

The first upload **must** be done manually in the Play Console UI. Google
verifies your signing identity, package name, and developer
registration during the first upload. Per the Tauri Google Play docs:
> The first upload must be made manually in the website so it can verify
> your app signature and bundle identifier.

### Steps

1. **Open the Play Console** → your app → **Release** →
   **Production** → **Create new release**.
2. Google Play Console asks you to enroll in **Play App Signing** if you
   haven't yet. This is mandatory and irreversible:
   - Google keeps a copy of the upload key.
   - Google re-signs the bundle with its own "app signing key" before
     distributing.
   - You can rotate the upload key later (reset via Play Console) but
     never the app signing key.
   - Accept the terms and click **Continue**.
3. **Upload the AAB**:
   - Drag-and-drop the `.aab` file you downloaded from GitHub Actions.
   - Or upload via `gh release download vX.Y.Z` and then upload via the
     Console UI.
4. **Release details**:
   - Release name (e.g. "Notes 0.4.0")
   - Release notes (per language — at minimum, the user's language)
   - Rollout percentage: start at **5%** (a small percentage of users)
     or **Internal testing** track first
5. **Review and roll out**. Google runs automated checks (usually 1-3
   hours for a first release, longer for a new app).
6. After the first successful production release, you can promote
   future releases to a higher rollout percentage automatically or
   manually.

### Recommended first track: Internal testing

Before sending to production, use the **Internal testing** track for
the first few builds:

1. **Release** → **Internal testing** → **Create new release**.
2. Upload the same AAB.
3. Add testers by email (you can add up to 100 internal testers).
4. Testers install Notes from a Play Store link that doesn't require
   production approval.

Once internal testers confirm everything works, promote the same AAB
build to **Closed testing** → **Open testing** → **Production** in
successive releases.

---

## Subsequent releases

After the first Play Console upload, future updates are routine:

```bash
# 1. Bump versions
# 2. git tag vX.Y.Z && git push origin main vX.Y.Z
# 3. CI builds desktop + Android, creates draft release
# 4. Manually promote the draft release to production
#    (or use gh release edit to remove draft:true)
# 5. In Play Console: Release → Production → Create new release
#    → upload the same .aab from GitHub Actions
# 6. Rollout (start at 5% if you want to be conservative)
```

---

## Rollback procedure

If a release causes critical bugs in production:

### Desktop (Windows / macOS / Linux)

The Tauri Updater plugin (configured per app, currently not active)
would push deltas to installed users. Without it, point users to the
GitHub Releases page and instruct them to manually downgrade.

### Android (Google Play)

1. Play Console → your app → **Release** → **Production**.
2. Find the bad release. Click **Halt rollout**.
3. The previous stable release keeps serving — Play Store doesn't
   auto-revert.
4. Cut a hotfix release (e.g. `vX.Y.Z+1`) following the same release
   process.

For emergencies, Play Console also supports:
- **Release removal**: removes a specific release from the store.
- **App removal**: removes the entire listing (irreversible).

---

## Troubleshooting

### CI fails on `tauri android init`

If the workflow fails at the `Initialize Android target` step:

```yaml
- name: Initialize Android target (idempotent)
  working-directory: apps/client
  run: |
    if [ ! -d src-tauri/gen/android ]; then
      pnpm tauri android init --ci
    else
      echo "Android target already initialized — skipping tauri android init."
    fi
```

Most common causes:
- `pnpm install` failed earlier in the step (check the previous step's
  log).
- The `apps/client/src-tauri/.gitignore` has `/gen/android/` — the
  `init --ci` step recreates it every time on a fresh checkout, so
  this shouldn't be a problem.
- The `pnpm` version mismatch — the workflow uses `pnpm@10` to match
  the lockfile.

### CI fails on `Apply release signing config`

`scripts/setup-android-signing.py` is idempotent and no-ops if the
signing block is already present. If it fails:

- The script is at `scripts/setup-android-signing.py`. Run locally:
  `python3 scripts/setup-android-signing.py`.
- Check the syntax of `gen/android/app/build.gradle.kts` against the
  Tauri 2 template — if it has been heavily modified, the regex may
  miss the injection points.

### CI fails on `Setup Android keystore`

```
base64 -d <<< "${{ secrets.ANDROID_KEY_BASE64 }}" > $RUNNER_TEMP/keystore.jks
```

If this fails, the `ANDROID_KEY_BASE64` secret is wrong. Re-export it
and re-paste it into GitHub Secrets:

```bash
base64 -i ~/upload-keystore.jks | pbcopy  # macOS
base64 -i ~/upload-keystore.jks         # Linux
```

Make sure there's **no trailing newline** in the secret value. GitHub
secrets can sometimes pick up an extra newline if you paste from a
terminal — paste from a text editor instead.

### CI fails on `Build release AAB`

- **Gradle "Build was cached" errors**: clear the cache via
  `swatinem/rust-cache@v2` → remove the `target/` directory before
  retrying.
- **`minSdkVersion` errors**: `tauri.conf.json > bundle > android > minSdkVersion`
  must be `>= 24`. Currently set to `30`. If you bump the version,
  double-check this value.
- **Out-of-memory in Gradle**: the GitHub-hosted `ubuntu-latest`
  runner has 7 GB RAM. The AAB build can spike to ~6 GB. If you see
  OOM errors, add `GRADLE_OPTS: "-Xmx4g"` to the build step's `env`.

### Play Console rejects the AAB

Most common cause: `applicationId` mismatch. Verify that
`tauri.conf.json > identifier` (`dev.donduque.notes`) matches what you
registered on Play Console. If you re-registered the app under a
different ID, you cannot upload an AAB with the old ID.

Second most common: `versionCode` not increasing. Play Store rejects
uploads where `versionCode` is not strictly greater than the previous
upload. Tauri derives `versionCode` from `version` automatically, but if
you forgot to bump `version`, this error appears.

---

## Future improvements

- **Automate Play Store upload via `google-play-android-publisher-api`** —
  the API exists but is out of scope for this initial release. The
  Tauri docs note this as "work in progress". Once implemented, the
  CI workflow would push the AAB to Play Console's Internal Testing
  track automatically after the build.
- **Tauri Updater plugin** — for desktop, the Tauri Updater plugin
  (currently not configured) can push delta updates to installed users
  without requiring them to download a new installer. See the
  `tauri-plugin-updater` docs when ready to enable this.
- **Code signing on macOS / Windows** — currently desktop builds ship
  unsigned (`APPLE_SIGNING_IDENTITY: "-"`). To distribute desktop
  builds outside the Mac App Store / outside Microsoft Store, you'll
  need macOS Developer ID and a Windows code-signing certificate. Add
  them as GitHub Secrets and wire them into the `tauri-action` step.
- **Crash reporting** — Firebase Crashlytics or Sentry for production
  builds. Currently the app has no production telemetry. Add the
  client SDK, configure dSYM / ProGuard mapping uploads, and wire
  secrets into the CI build.

---

## Security notes

### Keystore rotation policy

- **The upload key can be rotated** via Play Console (Settings → App
  integrity → Request upload key reset). This is a one-time operation
  per year per app and does not break existing users.
- **The app signing key cannot be rotated** by the developer — Google
  holds it. If you unenroll from Play App Signing, the app is
  permanently removed from the store.

### Branch protection on `main`

`main` is the source of truth for production. Recommended
`Settings → Branches → Branch protection rules`:

- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging (test-backend,
  test-frontend, build-tauri, build-android)
- ✅ Require linear history
- ❌ Do **not** allow force pushes on `main`
- ❌ Do **not** allow branch deletion on `main`

### What to do if a secret leaks

| Secret | Rotation path |
|---|---|
| `ANDROID_KEY_PASSWORD` | Generate a new keystore with `keytool -genkey ... -alias upload-new`. Coordinate with Play Console to migrate the upload key. |
| `ANDROID_KEY_BASE64` | Re-export from the new keystore, update the GitHub Secret. Old upload key can be rotated via Play Console. |
| `GITHUB_TOKEN` (auto-generated) | Rotate via Settings → GitHub Apps → repo's GitHub App → rotate token. |
| `VITE_API_BASE_URL` (not a secret) | Update the env var on the workflow and re-trigger the build. |
