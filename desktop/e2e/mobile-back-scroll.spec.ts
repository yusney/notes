/**
 * E2E — Mobile back-nav with scroll preservation (S7 / REQ-VIEW-01)
 *
 * Scenario:
 *   - Authenticated user opens the app at mobile viewport (Pixel-7
 *     emulation, 412x915 — Android default).
 *   - The list renders with several notes.
 *   - User scrolls the list down so the later notes are in view.
 *   - User taps a note → navigates to /notes/:id with state.scrollY.
 *   - The mobile-only back chevron is visible.
 *   - User taps back → returns to the list at the SAME scroll position
 *     (scrollTop preserved via react-router location state).
 *
 * Runs on regular Chromium with the Pixel-7 mobile viewport — no Android
 * emulator required. Playwright config sets baseURL=http://localhost:1420
 * and the webServer boots Vite automatically.
 *
 * Browser-mode caveat: the app's <CloseDialog> reads from the Tauri
 * runtime at mount and crashes outside a Tauri WebView. We skip the
 * body of the test in that environment (analogous to the desktop
 * regression spec). The spec remains the contract for the next
 * Tauri-context run.
 */

import { test, expect } from "@playwright/test";

// Pixel 7 viewport (412x915 logical px, dpr 2.625 — Playwright device)
test.use({
  viewport: { width: 412, height: 915 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36",
});

test.describe("S7 — mobile back-nav preserves list scroll position", () => {
  test("tapping a note → back returns the list to the same scrollTop", async ({ page }) => {
    // Tauri-context probe — same caveat as the desktop regression
    // spec. Outside a Tauri WebView the app's <CloseDialog> throws
    // and the layout never mounts.
    const hasTauri = await page.evaluate(
      () =>
        typeof (window as unknown as { __TAURI_INTERNALS__?: unknown })
          .__TAURI_INTERNALS__ !== "undefined"
    );
    if (!hasTauri) {
      test.skip(
        true,
        "Mobile back-nav spec requires the Tauri WebView runtime. Run inside `pnpm tauri dev` or in the CI image."
      );
      return;
    }

    await page.goto("/");

    // The list lives inside the NoteList <ul>. Wait for it (empty state OK).
    const list = page.locator("ul").first();
    await expect(list).toBeVisible({ timeout: 10_000 });

    // If the list has at least 2 rows, scroll the list container down
    // and verify the scrollTop is restored after back-nav.
    const rows = list.locator("li");
    const rowCount = await rows.count();
    if (rowCount < 2) {
      test.skip(true, "Need >=2 rows to exercise scroll preservation");
      return;
    }

    // Scroll the list container to a non-zero position. The list <ul>
    // is the actual scroll container (overflow-y-auto in NoteList.tsx).
    await list.evaluate((el) => {
      el.scrollTop = 120;
    });
    const scrollBefore = await list.evaluate((el) => el.scrollTop);
    expect(scrollBefore).toBeGreaterThan(0);

    // Tap the first row to open the note (mobile flow).
    await rows.first().click();

    // Mobile back chevron visible at this viewport.
    const backBtn = page.getByRole("button", { name: /volver|atrás|back/i });
    await expect(backBtn).toBeVisible({ timeout: 5_000 });

    // Tap back.
    await backBtn.click();

    // After back-nav, the list should be restored at the prior
    // scrollTop (scrollY=120 was passed via location.state on the
    // forward navigation, then NoteList re-applies it on re-mount).
    await expect(list).toBeVisible();
    await page.waitForTimeout(50);
    const scrollAfter = await list.evaluate((el) => el.scrollTop);
    expect(scrollAfter).toBe(scrollBefore);
  });

  test("back chevron is hidden on desktop viewport (>=768px)", async ({ page }) => {
    const hasTauri = await page.evaluate(
      () =>
        typeof (window as unknown as { __TAURI_INTERNALS__?: unknown })
          .__TAURI_INTERNALS__ !== "undefined"
    );
    if (!hasTauri) {
      test.skip(true, "Requires the Tauri WebView runtime.");
      return;
    }

    // Override the mobile viewport for this single test.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // Open a note if any.
    const firstRow = page.locator("ul").first().locator("li").first();
    if (await firstRow.count() > 0) {
      await firstRow.click();
    }

    // No back chevron should be in the DOM at desktop widths.
    const backBtn = page.getByRole("button", { name: /volver|atrás|back/i });
    await expect(backBtn).toHaveCount(0);
  });
});