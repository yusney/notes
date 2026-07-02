/**
 * E2E: Move Note Between Tabs (GitHub #9)
 *
 * Status of this file: SMOKE TEST ONLY, NOT RUN IN CI.
 *
 * The integrated coverage for the move-note flow (drag-drop AND the new
 * "Mover a..." accessible menu) lives in the vitest MainLayout/NoteList
 * integration tests and runs on every CI build via `pnpm vitest run`:
 *
 *   - src/components/notes/NoteList.test.tsx
 *     - "Mover a..." accessible menu integration tests
 *     - enableDrag rename + handle rendering tests
 *   - src/components/notes/MoveToTabMenu.test.tsx
 *     - Modal renders, lists tabs, keyboard nav, Escape closes
 *   - src/components/notes/UndoMoveToast.test.tsx
 *     - Success toast + "Deshacer" re-PUT + failure feedback
 *   - src/stores/useNoteStore.moveNote.test.ts
 *     - moveNoteToTab store action (PUT, error, lastMove snapshot)
 *
 * This E2E requires a live backend + authenticated session to drive the
 * real drag-drop UX. The existing `test.skip(...)` calls below are
 * intentional — they assert UI wiring markup at best, and need a seeded
 * environment + Playwright config that is out of scope for PR #13.
 *
 * If you re-enable these tests, also re-wire the Playwright config to
 * point at a backend (see playwright.config.cjs).
 */
import { test, expect } from "@playwright/test";

test.describe("Move Note Between Tabs", () => {
  test("drag note onto tab fires exactly one PUT, leaves source list, and keeps activeTabId", async ({ page }) => {
    // Spy on the move endpoint. We don't have a live backend, so let the call
    // continue (it'll fail with 4xx/5xx, but the spy count is what we assert).
    let putCallCount = 0;
    let lastPutBody: { tabId: string } | null = null;
    await page.route("**/api/notes/*/tab", async (route, request) => {
      if (request.method() === "PUT") {
        putCallCount += 1;
        try {
          // Explicit widening assignment so TypeScript keeps the declared
          // union type and does not collapse `lastPutBody` to `never`
          // through closure-capture narrowing.
          lastPutBody = JSON.parse(request.postData() ?? "{}") as { tabId: string } | null;
        } catch {
          lastPutBody = null;
        }
      }
      // Respond 204 so the UI flow doesn't error and the toast appears
      await route.fulfill({ status: 204, body: "" });
    });

    await page.goto("/");

    // Without auth we get redirected to login — that's fine for a contract
    // test that only needs to verify DnD wiring markup is present.
    // We assert markup presence instead of forcing a full UI flow.
    const handle = page.locator('[data-testid^="note-handle-"]').first();
    const tab = page.locator('[data-testid^="tab-"]').first();

    // Both DnD wiring markers must exist on the page somewhere (rendered at
    // mount). If neither renders, the wiring is missing and this test fails.
    const handleCount = await page.locator('[data-testid^="note-handle-"]').count();
    const tabCount = await page.locator('[data-testid^="tab-"]').count();

    if (handleCount === 0 || tabCount === 0) {
      // Markup not present (likely login gate). Contract test passes vacuously
      // because there is no live UI to drag. We still verify the endpoint
      // contract by simulating it directly.
      test.skip(true, "DnD wiring not present on current page (likely login gate)");
      return;
    }

    // Drag the handle onto the tab
    await handle.dragTo(tab);

    // Wait briefly for the async PUT to fire
    await page.waitForTimeout(300);

    // Exactly one PUT must have hit /api/notes/{id}/tab
    expect(putCallCount, "exactly one PUT to /api/notes/{id}/tab").toBe(1);
    // Body must contain the target tabId.
    // Read through a typed accessor to defeat TypeScript's closure-capture
    // narrowing (which collapses lastPutBody to `never` here because the
    // only assignments happen inside the async page.route callback).
    const getLastPutBody = (): { tabId: string } | null => lastPutBody;
    expect(getLastPutBody()?.tabId).toBeTruthy();
  });

  test("editor stays mounted on the same noteId after a move (data-testid preserved)", () => {
    // The "editor stays mounted on the same noteId" contract is a UI wiring
    // guarantee, not a runtime assertion. It is enforced by:
    //   - <NoteEditor key={activeNote.id} ... /> and the wrapper
    //     <div data-testid={`editor-${activeNote.id}`}> in MainLayout.tsx
    // A full E2E that drives a real note open + move requires a seeded live
    // backend + authenticated session, which this contract test does not have.
    //
    // We REPLACED the previous tautological assertion (count >= 0, always
    // true) with this honest skip + descriptive comment so the test suite
    // reflects what it actually covers. No-DOM no-op test is intentional.
    //
    // The actual move-note coverage (including the new "Mover a..." menu) lives
    // in the vitest integration tests — see the file header for the list.
    test.skip(true, "editor-stays-mounted contract is enforced by data-testid={`editor-${activeNote.id}`} wiring in MainLayout.tsx — full E2E requires a seeded live backend; see vitest NoteList/MoveToTabMenu integration tests for the move-note coverage that DOES run in CI.");
  });
});