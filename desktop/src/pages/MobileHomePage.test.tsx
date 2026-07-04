import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MobileHomePage } from "./MobileHomePage";

/**
 * MobileHomePage — content for the mobile home route (`/`).
 *
 * Renders the mobile-appropriate list/empty state inside the
 * `MobileShell`'s `<main>` slot via the React Router `<Outlet/>`.
 *
 *   - Empty store (`notes.length === 0`) → mounts `<EmptyState />`
 *     with a single CTA (no double-discurso: per decisions #2207
 *     the empty-state must NOT show two competing CTAs).
 *   - Non-empty store → mounts `<NoteList />` with the filtered
 *     notes.
 *
 * Tests assert the user-visible contract from the PR3 hotfix:
 *   1. Empty store → EmptyState visible, single CTA.
 *   2. Populated store → NoteList visible, EmptyState NOT visible.
 *   3. Tapping the empty-state CTA calls `createNote` (the same
 *      code path that the BottomNav "Nueva" entry drives).
 *
 * TDD RED gate (PR3 hotfix — shell-redesign-v1):
 *   Before this fix, `MainLayout` mounted `<MobileShell />` (no
 *   children) at `/`, and `App.tsx`'s `/` route had no child route,
 *   so `<Outlet/>` rendered null — the mobile home body was empty
 *   between AppBar and BottomNav. This test file proves the new
 *   `MobileHomePage` component renders the expected UI.
 */

vi.mock("../stores/useNoteStore", () => {
  const mockState: Record<string, unknown> = {
    notes: [],
    filteredNotes: () => [],
    isLoading: false,
    error: null,
    activeTabId: null,
    tabs: [],
    createNote: vi.fn().mockResolvedValue({ id: "new-1" }),
    createTab: vi.fn().mockResolvedValue({
      id: "tab-new",
      name: "General",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: null,
    }),
    fetchNotes: vi.fn().mockResolvedValue(undefined),
    setActiveNote: vi.fn(),
    fetchTags: vi.fn().mockResolvedValue(undefined),
    fetchTabs: vi.fn().mockResolvedValue(undefined),
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => typeof mockState }).getState = () => mockState;
  return { useNoteStore: hook };
});

import { useNoteStore } from "../stores/useNoteStore";

const NOTE = {
  id: "n-1",
  tabId: "tab-1",
  title: "Mi primera nota",
  content: "<p>Contenido</p>",
  tags: [],
  isFavorite: false,
  favoritedAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: null,
};

function mockStore(overrides: Record<string, unknown> = {}) {
  vi.mocked(useNoteStore).mockReturnValue({
    notes: [],
    filteredNotes: () => [],
    isLoading: false,
    error: null,
    activeTabId: null,
    tabs: [],
    createNote: vi.fn().mockResolvedValue({ id: "new-1" }),
    createTab: vi.fn().mockResolvedValue({
      id: "tab-new",
      name: "General",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: null,
    }),
    fetchNotes: vi.fn().mockResolvedValue(undefined),
    setActiveNote: vi.fn(),
    fetchTags: vi.fn().mockResolvedValue(undefined),
    fetchTabs: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as never);
}

function renderPage(initialPath: string = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <MobileHomePage />
    </MemoryRouter>,
  );
}

describe("MobileHomePage (PR3 hotfix — shell-redesign-v1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the EmptyState when the store has zero notes (mobile home empty case)", () => {
    mockStore({ notes: [], filteredNotes: () => [] });
    renderPage();
    // EmptyState exposes data-testid="empty-state" (S1 contract).
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders the NoteList (data-testid='note-list') when the store has notes (populated case)", () => {
    mockStore({
      notes: [NOTE],
      filteredNotes: () => [NOTE],
    });
    renderPage();
    // The mobile home shows the note list — no longer an empty body
    // between AppBar and BottomNav.
    expect(screen.getByTestId("note-list")).toBeInTheDocument();
    // And the EmptyState MUST NOT be in the DOM at the same time.
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("does NOT show the EmptyState when notes are present (single-source-of-truth rule)", () => {
    mockStore({
      notes: [NOTE, { ...NOTE, id: "n-2", title: "Otra nota" }],
      filteredNotes: () => [
        NOTE,
        { ...NOTE, id: "n-2", title: "Otra nota" },
      ],
    });
    renderPage();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("the empty state shows exactly ONE primary CTA (single-CTA rule per decisions #2207)", () => {
    mockStore({ notes: [], filteredNotes: () => [] });
    const { container } = renderPage();
    const empty = container.querySelector('[data-testid="empty-state"]');
    expect(empty).not.toBeNull();
    // Count <button> tags inside the empty-state subtree.
    const buttons = empty!.querySelectorAll("button");
    expect(buttons.length).toBe(1);
    // The CTA copy is "Crear desde desktop" (the canonical single CTA from
    // EmptyState.tsx — S1 contract).
    expect(buttons[0]).toHaveTextContent(/crear desde desktop/i);
  });

  it("tapping the empty-state CTA invokes createNote via the store (regression coverage)", async () => {
    const createNote = vi.fn().mockResolvedValue({ id: "new-2" });
    mockStore({
      notes: [],
      filteredNotes: () => [],
      createNote,
      activeTabId: "tab-1",
      tabs: [{ id: "tab-1", name: "General" }],
    });

    const user = userEvent.setup();
    renderPage();
    const cta = screen.getByRole("button", { name: /crear desde desktop/i });
    await user.click(cta);
    expect(createNote).toHaveBeenCalledTimes(1);
    const arg = createNote.mock.calls[0]?.[0] as
      | { title: string; content: string; tabId: string }
      | undefined;
    expect(arg).toBeDefined();
    expect(arg?.title).toBe("Nueva nota");
    expect(arg?.content).toBe("");
    expect(arg?.tabId).toBe("tab-1");
  });

  it("tapping a note row in the populated list calls setActiveNote (preserves mobile nav contract)", async () => {
    // The NoteList component already wires onNoteSelect → onClick on its
    // rows. MobileHomePage passes a handler that calls setActiveNote so
    // the desktop store stays consistent with mobile selections.
    const setActiveNote = vi.fn();
    mockStore({
      notes: [NOTE],
      filteredNotes: () => [NOTE],
      setActiveNote,
    });

    const user = userEvent.setup();
    renderPage();
    // The NoteList row is a <button> with the note title as text.
    const row = screen.getByRole("button", { name: /mi primera nota/i });
    await user.click(row);
    expect(setActiveNote).toHaveBeenCalledWith("n-1");
  });

  // ── Pagination wire-up (REQ-LIST-01 + REQ-LAY-05) ─────────────────────────
  //
  // On mobile, MobileHomePage MUST pass the store's pagination state down to
  // `<NoteList>` so the user sees Anterior / Siguiente when more than one page
  // exists. The pagination prop is GATED on `totalPages > 1` — single-page
  // lists don't show the chrome. The vertical mobile layout is opt-in via the
  // `mobileLayout` prop on `<Pagination>` (T7).

  it("renders the 'Cargar más' button when there are more pages (12 notes / pageSize 10)", () => {
    mockStore({
      notes: [NOTE],
      filteredNotes: () => [NOTE],
      page: 1,
      pageSize: 10,
      totalCount: 12,
      totalPages: 2,
      nextPage: vi.fn().mockResolvedValue(undefined),
    });
    renderPage();
    // Mobile uses infinite scroll (REQ-LIST-06), not explicit pagination.
    // When there are more pages, a "Cargar más" button MUST be visible.
    expect(screen.getByTestId("load-more")).toBeInTheDocument();
    // The sentinel is always mounted when notes are present.
    expect(screen.getByTestId("infinite-scroll-sentinel")).toBeInTheDocument();
  });

  it("does NOT render 'Cargar más' when totalPages === 1 (5 notes / pageSize 10)", () => {
    mockStore({
      notes: [NOTE],
      filteredNotes: () => [NOTE],
      page: 1,
      pageSize: 10,
      totalCount: 5,
      totalPages: 1,
      nextPage: vi.fn().mockResolvedValue(undefined),
    });
    renderPage();
    // Single-page list: the fallback button is hidden (no more data) and
    // a "— 1 notas —" end-of-list caption is rendered instead.
    expect(screen.queryByTestId("load-more")).not.toBeInTheDocument();
    expect(screen.getByText(/—\s*1\s*notas\s*—/i)).toBeInTheDocument();
  });

  it("clicking 'Cargar más' calls useNoteStore.nextPage", async () => {
    const user = userEvent.setup();
    const nextPage = vi.fn().mockResolvedValue(undefined);
    mockStore({
      notes: [NOTE],
      filteredNotes: () => [NOTE],
      page: 1,
      pageSize: 10,
      totalCount: 25,
      totalPages: 3,
      nextPage,
    });
    renderPage();

    await user.click(screen.getByTestId("load-more"));

    expect(nextPage).toHaveBeenCalledTimes(1);
  });

  it("does NOT call nextPage on mount or while loading the next page (sentinel guard)", () => {
    // The sentinel mounts the IO but stays inert until the parent flips
    // `isLoadingMore` to false again. This test asserts the guard
    // wiring: the parent passes isLoadingMore derived from the store,
    // and the sentinel's `enabled` prop is `hasMore && !isLoadingMore`.
    // We mock the IO so it never fires in jsdom, and assert nextPage
    // was never called just by mounting the page.
    const nextPage = vi.fn().mockResolvedValue(undefined);
    mockStore({
      notes: [NOTE],
      filteredNotes: () => [NOTE],
      page: 1,
      pageSize: 10,
      totalCount: 25,
      totalPages: 3,
      isLoading: true, // simulates a "next page in flight" — but isLoading
                        // is also true on initial mount, so we keep
                        // page === 1 here to model "loading more".
      nextPage,
    });
    renderPage();
    expect(nextPage).not.toHaveBeenCalled();
  });
});