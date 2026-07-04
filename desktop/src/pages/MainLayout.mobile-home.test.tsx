import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../App";

/**
 * MainLayout — mobile home integration (PR3 hotfix — shell-redesign-v1).
 *
 * The PR3 bug: at `/`, the `MobileShell` subtree inside `MainLayout`
 * mounted an AppBar + BottomNav but its `<main><Outlet/></main>` was
 * empty because `App.tsx` had no child route beneath `/`. The user
 * saw a blank body between the AppBar and BottomNav.
 *
 * These tests assert the user-visible contract of the FIX by
 * mounting the FULL `AppRoutes` (extracted from `App.tsx`) inside a
 * `MemoryRouter`. This gives the `<Outlet/>` inside the
 * MainLayout-mounted MobileShell a real route tree to match against,
 * including the new `<Route index element={<MobileHomePage />} />`
 * added as the child of `/`.
 *
 *   - Empty store + mobile viewport → EmptyState (single CTA) in
 *     the MobileShell `<main>`.
 *   - Populated store + mobile viewport → NoteList in the
 *     MobileShell `<main>`. EmptyState is NOT visible.
 *   - Desktop viewport → REQ-LAY-01 desktop-pixel-identical holds
 *     (MobileShell subtree stays `md:hidden`, AppBar/BottomNav
 *     chrome still present in the DOM tree).
 *
 * NOTE on mocks: we mock the data-layer stores (`useNoteStore`,
 * `useAuthStore`, etc.) so the route tree renders without calling
 * the backend. `NoteList` is NOT mocked — the test asserts the real
 * component is mounted in the MobileShell `<main>` slot.
 */

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock("../stores/useNoteStore", () => {
  const mockState = {
    tabs: [],
    notes: [],
    visibleNoteIds: [],
    activeTabId: null,
    activeNoteId: null,
    fetchTabs: vi.fn().mockResolvedValue(undefined),
    fetchNotes: vi.fn().mockResolvedValue(undefined),
    createTab: vi.fn().mockResolvedValue({
      id: "tab-new",
      name: "General",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: null,
    }),
    createNote: vi.fn().mockResolvedValue({ id: "new-1" }),
    updateNote: vi.fn().mockResolvedValue(undefined),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    getShareWarning: vi.fn().mockResolvedValue({ hasActiveShares: false, count: 0 }),
    exportNotes: vi.fn().mockResolvedValue(undefined),
    setActiveTab: vi.fn(),
    setActiveNote: vi.fn(),
    setSearchQuery: vi.fn(),
    setSelectedTagIds: vi.fn(),
    setSortBy: vi.fn(),
    setFavoriteFilter: vi.fn(),
    setPage: vi.fn().mockResolvedValue(undefined),
    filteredNotes: vi.fn().mockReturnValue([]),
    searchQuery: "",
    selectedTagIds: [],
    sortBy: "creation",
    sortOrder: "desc",
    isFavoriteOnly: false,
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    isLoading: false,
    error: null,
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => typeof mockState }).getState = () => mockState;
  (hook as unknown as { setState: (partial: Partial<typeof mockState>) => void }).setState =
    (partial) => Object.assign(mockState, partial);
  return { useNoteStore: hook };
});

vi.mock("../stores/useAuthStore", () => {
  const mockState = {
    user: { name: "Test" },
    accessToken: "fake-token",
    isAuthenticated: true,
    isInitialized: true,
    isLoading: false,
    error: null,
    logout: vi.fn().mockResolvedValue(undefined),
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => typeof mockState }).getState = () => mockState;
  return { useAuthStore: hook };
});

vi.mock("../stores/useTagStore", () => {
  const mockState = {
    tags: [],
    fetchTags: vi.fn().mockResolvedValue(undefined),
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => typeof mockState }).getState = () => mockState;
  return { useTagStore: hook };
});

vi.mock("../stores/usePreferencesStore", () => {
  const mockState = {
    sortBy: "creation",
    sortOrder: "desc",
    theme: "dark",
    fetchPreferences: vi.fn().mockResolvedValue(undefined),
    updatePreferences: vi.fn().mockResolvedValue(undefined),
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => typeof mockState }).getState = () => mockState;
  return { usePreferencesStore: hook };
});

vi.mock("../components/layout/Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("../components/share/ShareWarningDialog", () => ({
  ShareWarningDialog: () => null,
}));

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

describe("MainLayout mobile home integration (PR3 hotfix — shell-redesign-v1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the EmptyState in the MobileShell <main> at '/' when the store is empty (mobile)", async () => {
    mockMatchMedia(true);
    // Default mock already has notes=[] and filteredNotes=()=>[].

    const { findByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    // MobileShell <main> should contain the EmptyState (PR3 hotfix contract).
    // Pre-fix: <main> had zero children because <Outlet/> resolved to null.
    const empty = await findByTestId("empty-state");
    expect(empty).not.toBeNull();
  });

  it("renders the NoteList in the MobileShell <main> at '/' when the store has notes (mobile)", async () => {
    mockMatchMedia(true);
    vi.mocked(useNoteStore).mockReturnValue({
      tabs: [{ id: "tab-1", name: "General", createdAt: "2024-01-01T00:00:00Z", updatedAt: null }],
      notes: [NOTE],
      visibleNoteIds: ["n-1"],
      activeTabId: "tab-1",
      activeNoteId: null,
      fetchTabs: vi.fn().mockResolvedValue(undefined),
      fetchNotes: vi.fn().mockResolvedValue(undefined),
      createTab: vi.fn().mockResolvedValue({
        id: "tab-new",
        name: "General",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: null,
      }),
      createNote: vi.fn().mockResolvedValue({ id: "new-1" }),
      updateNote: vi.fn().mockResolvedValue(undefined),
      deleteNote: vi.fn().mockResolvedValue(undefined),
      getShareWarning: vi.fn().mockResolvedValue({ hasActiveShares: false, count: 0 }),
      exportNotes: vi.fn().mockResolvedValue(undefined),
      setActiveTab: vi.fn(),
      setActiveNote: vi.fn(),
      setSearchQuery: vi.fn(),
      setSelectedTagIds: vi.fn(),
      setSortBy: vi.fn(),
      setFavoriteFilter: vi.fn(),
      setPage: vi.fn().mockResolvedValue(undefined),
      filteredNotes: () => [NOTE],
      searchQuery: "",
      selectedTagIds: [],
      sortBy: "creation",
      sortOrder: "desc",
      isFavoriteOnly: false,
      page: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
      isLoading: false,
      error: null,
    } as never);

    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    // Pre-fix: the MobileShell <main> had zero children because
    // <Outlet/> resolved to null. Post-fix: it contains the NoteList
    // (now exposing data-testid="note-list" — added in PR3 hotfix so
    // this integration test can assert it).
    //
    // Both the desktop list panel (hidden md:flex) and the mobile
    // NoteList have data-testid="note-list" (the desktop one was
    // already mocked that way in MainLayout.test.tsx, the real one
    // got the testid in PR3). We scope to the MobileShell subtree so
    // we assert the MOBILE one — that's the fix being verified.
    const mobileShell = container.querySelector('[data-testid="mobile-shell"]');
    expect(mobileShell).not.toBeNull();
    const mobileMain = mobileShell!.querySelector("main");
    expect(mobileMain).not.toBeNull();
    expect(mobileMain!.querySelector('[data-testid="note-list"]')).not.toBeNull();
    // And the EmptyState is NOT in the populated state (no double-discurso).
    expect(mobileMain!.querySelector('[data-testid="empty-state"]')).toBeNull();
  });

  it("on desktop, the MobileShell subtree stays `md:hidden` (REQ-LAY-01 desktop-pixel-identical)", () => {
    mockMatchMedia(false);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    // MobileShell is still in the DOM tree (just visually hidden via
    // md:hidden CSS). The AppBar inside MobileShell renders regardless.
    expect(screen.getByTestId("app-bar")).toBeInTheDocument();
    const mobileShell = document.querySelector('[data-testid="mobile-shell"]');
    expect(mobileShell).not.toBeNull();
    expect(mobileShell!.className).toMatch(/\bmd:hidden\b/);
    // The wrapper carrying the MobileShell subtree is also `md:hidden`
    // (REQ-LAY-01 — desktop pixel-identical).
    const wrapper = mobileShell!.parentElement as HTMLElement;
    expect(wrapper.className).toMatch(/\bmd:hidden\b/);
  });
});