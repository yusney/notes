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

  it("renders pagination chrome when totalPages > 1 (12 notes / pageSize 10)", () => {
    mockStore({
      notes: [NOTE],
      filteredNotes: () => [NOTE],
      page: 1,
      pageSize: 10,
      totalCount: 12,
      totalPages: 2,
      setPage: vi.fn().mockResolvedValue(undefined),
    });
    renderPage();
    // Pagination renders when NoteList receives a defined `pagination` prop.
    expect(screen.getByText(/mostrando 1-10 de 12 notas/i)).toBeInTheDocument();
    expect(screen.getByText(/página 1 de 2/i)).toBeInTheDocument();
  });

  it("does NOT render pagination when totalPages === 1 (5 notes / pageSize 10)", () => {
    mockStore({
      notes: [NOTE],
      filteredNotes: () => [NOTE],
      page: 1,
      pageSize: 10,
      totalCount: 5,
      totalPages: 1,
      setPage: vi.fn().mockResolvedValue(undefined),
    });
    renderPage();
    // Single-page list: the gated pagination prop is undefined → Pagination
    // never mounts, so the count chrome disappears entirely.
    expect(screen.queryByText(/mostrando/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/página/i)).not.toBeInTheDocument();
  });

  it("clicking Siguiente calls useNoteStore.setPage with the next page", async () => {
    const user = userEvent.setup();
    const setPage = vi.fn().mockResolvedValue(undefined);
    mockStore({
      notes: [NOTE],
      filteredNotes: () => [NOTE],
      page: 1,
      pageSize: 10,
      totalCount: 25,
      totalPages: 3,
      setPage,
    });
    renderPage();

    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("tapping Anterior on page 2 calls useNoteStore.setPage(1)", async () => {
    const user = userEvent.setup();
    const setPage = vi.fn().mockResolvedValue(undefined);
    mockStore({
      notes: [NOTE],
      filteredNotes: () => [NOTE],
      page: 2,
      pageSize: 10,
      totalCount: 25,
      totalPages: 3,
      setPage,
    });
    renderPage();

    await user.click(screen.getByRole("button", { name: /anterior/i }));

    expect(setPage).toHaveBeenCalledWith(1);
  });
});