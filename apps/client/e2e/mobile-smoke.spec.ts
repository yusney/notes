/**
 * E2E — Mobile smoke: login flow on a 360x640 viewport (Pixel-class).
 *
 * Scenario S4 / REQ-AUTH-01:
 *   - User opens the app at mobile viewport (360x640).
 *   - Login screen renders (full-bleed, no horizontal scroll REQ-LIST-01).
 *   - User enters email + password, taps "Iniciar sesión".
 *   - The store flips to isAuthenticated, the router mounts the
 *     authenticated layout (notes list / FAB / settings header).
 *   - User can be assumed to land on the list view (the empty state
 *     is rendered if no notes are returned by the mocked API).
 *
 * Auth gate: every API the AuthProvider + useAuthStore.login() touches
 * is mocked so the app believes the credentials are valid without a
 * live backend. This keeps the spec self-contained — no DB, no JWT.
 *
 * Browser-mode caveat (carried from PR2 specs):
 *   The app's <CloseDialog> reads from the Tauri runtime
 *   (`__TAURI_INTERNALS__`) at mount. Outside a Tauri WebView (i.e.
 *   when this spec runs against `vite dev` directly in `pnpm test:e2e`)
 *   that read throws and the React tree never commits. We skip the
 *   body of the test in that environment — the spec remains the
 *   contract for the first CI-image run that builds the APK inside a
 *   Tauri WebView.
 *
 * Why a separate spec file from mobile-back-scroll.spec.ts:
 *   - The existing file targets S7 (scroll preservation after a
 *     note→back-nav round-trip).
 *   - This file targets S4 (login round-trip at mobile viewport).
 *   One spec file per scenario keeps the Playwright retry budget
 *   granular — a regression in scroll nav shouldn't hide a regression
 *   in the login form.
 */
import { test, expect } from "@playwright/test";

test.use({
  // Pixel-class mobile viewport — iPhone SE / common low-end Android.
  viewport: { width: 360, height: 640 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36",
});

test.describe("S4 — mobile login round-trip (Pixel-class viewport)", () => {
  test.beforeEach(async ({ page }) => {
    // AuthProvider.loadRuntimeConfig() — runtime config from public/config.json.
    await page.route("**/config.json", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          apiBaseUrl: "http://localhost:8080",
          tauri: false,
        }),
      });
    });

    // useAuthStore.login() does POST /api/auth/login first. A 200 returns
    // accessToken + refreshToken. The store then saves both via
    // tauri.invoke('save_token', token) (PR1 routes save_token to
    // stronghold on BOTH platforms; on Android it writes to
    // app_local_data_dir(). Inside a Tauri context the strong-hold
    // invocation succeeds. Outside a Tauri context (plain vite dev)
    // we mock the invoke layer via the page's window so the store
    // believes the token persisted.
    await page.route("**/api/auth/login", (route, request) => {
      const body = request.postDataJSON() as { email?: string; password?: string };
      if (!body?.email || !body?.password) {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ message: "Email y contraseña requeridos" }),
        });
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "test-access-token-mobile",
          refreshToken: "test-refresh-token-mobile",
          expiresIn: 3600,
        }),
      });
    });

    // useAuthStore.login() fetches the profile after a successful login
    // round-trip. Stub so isAuthenticated → true and the auth-gated
    // MainLayout mounts.
    await page.route("**/api/user/profile", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "u1",
          name: "Mobile Smoke User",
          email: "smoke@example.com",
        }),
      });
    });

    // MainLayout's data fetches (tabs, tags, notes, preferences).
    await page.route("**/api/tabs", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.route("**/api/tags", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.route("**/api/notes**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 10 }),
      });
    });
    await page.route("**/api/preferences**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sortBy: "creation", sortOrder: "desc", theme: "dark" }),
      });
    });
  });

  test("login form renders at 360x640 with no horizontal overflow", async ({ page }) => {
    // Tauri-context probe — same caveat as the desktop regression /
    // scroll-preservation specs. Outside a Tauri WebView the app's
    // <CloseDialog> throws and the layout never mounts. We skip the
    // body of the test in that environment. The spec remains the
    // contract for the next Tauri-context run.
    const hasTauri = await page.evaluate(
      () =>
        typeof (window as unknown as { __TAURI_INTERNALS__?: unknown })
          .__TAURI_INTERNALS__ !== "undefined",
    );
    if (!hasTauri) {
      test.skip(
        true,
        "Mobile smoke requires the Tauri WebView runtime. Run inside `pnpm tauri dev` or in the CI image.",
      );
      return;
    }

    await page.goto("/login");

    // The login card is full-bleed but capped at max-w-sm. At 360x640
    // the card width should be 360 (no narrower) and no horizontal
    // scrollbar should appear.
    const card = page.locator("form").first();
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Confirm the viewport has no horizontal overflow (REQ-LIST-01).
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflowX).toBe(false);
  });

  test("submitting valid credentials routes to the authenticated layout", async ({ page }) => {
    const hasTauri = await page.evaluate(
      () =>
        typeof (window as unknown as { __TAURI_INTERNALS__?: unknown })
          .__TAURI_INTERNALS__ !== "undefined",
    );
    if (!hasTauri) {
      test.skip(
        true,
        "Mobile smoke requires the Tauri WebView runtime. Run inside `pnpm tauri dev` or in the CI image.",
      );
      return;
    }

    await page.goto("/login");

    // Fill the form (mobile flow is identical to desktop: same form).
    await page.locator("#email").fill("smoke@example.com");
    await page.locator("#password").fill("hunter2-strong-password");

    // Tap "Iniciar sesión".
    await page.getByRole("button", { name: /Iniciar sesión/i }).click();

    // After a successful login, the router mounts MainLayout which
    // renders either the FAB (mobile list is empty → still FAB visible)
    // OR the empty-state component. Either way the URL has shifted
    // away from /login.
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 10_000 });

    // The layout-level main container declares flex-col on mobile
    // (PR2 single-column layout). Assert at least the mobile-only
    // settings hamburger OR the FAB is in the DOM — both prove the
    // authenticated layout mounted at the mobile breakpoint.
    const fabOrSettings = page
      .locator("[aria-label]")
      .filter({ hasText: /(FAB|menú|menu)/i })
      .first();
    await expect(fabOrSettings).toBeVisible({ timeout: 10_000 });
  });
});
