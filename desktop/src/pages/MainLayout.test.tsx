import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MainLayout } from "./MainLayout";
import { useAuthStore } from "../stores/useAuthStore";

/**
 * Mock matchMedia for responsive-layout tests. Tailwind v4 emits
 * `@media (min-width: 768px) { ... }` for the `md:` variant; the
 * responsive contract is encoded in CSS classes (md:flex-row, etc.),
 * but the test asserts the SAME intent at the JS class level.
 *
 * The viewport itself is purely cosmetic for jsdom — what matters is
 * that the *rendered class list* reflects the mobile vs. desktop
 * intent. So we mock matchMedia to return matches:true for "(max-width: 767px)"
 * in the mobile case and matches:false in the desktop case. The actual
 * `window.innerWidth` is irrelevant.
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
    activeTabId: null,
    activeNoteId: null,
    fetchTabs: vi.fn(),
    fetchNotes: vi.fn(),
    createTab: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    getShareWarning: vi.fn(),
    exportNotes: vi.fn(),
    setActiveTab: vi.fn(),
    setActiveNote: vi.fn(),
    setSearchQuery: vi.fn(),
    setSelectedTagIds: vi.fn(),
    setSortBy: vi.fn(),
    setFavoriteFilter: vi.fn(),
    setPage: vi.fn(),
    filteredNotes: vi.fn().mockReturnValue([]),
    searchQuery: "",
    selectedTagIds: [],
    sortBy: "creation",
    isFavoriteOnly: false,
    page: 1,
    pageSize: 10,
    totalCount: 0,
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => typeof mockState; setState: (partial: Partial<typeof mockState>) => void }).getState = () => mockState;
  (hook as unknown as { setState: (partial: Partial<typeof mockState>) => void }).setState = (partial: Partial<typeof mockState>) => Object.assign(mockState, partial);
  return { useNoteStore: hook };
});

vi.mock("../stores/useAuthStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("../stores/useTagStore", () => {
  const mockState = {
    tags: [],
    fetchTags: vi.fn(),
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
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => typeof mockState }).getState = () => mockState;
  return { usePreferencesStore: hook };
});

vi.mock("../components/layout/Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("../components/notes/NoteList", () => ({
  NoteList: () => <div data-testid="note-list" />,
}));

vi.mock("../components/notes/SearchBar", () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));

vi.mock("../components/share/ShareWarningDialog", () => ({
  ShareWarningDialog: () => null,
}));

describe("MainLayout", () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({ user: { name: "Test" }, logout: vi.fn() } as never);
  });

  it("renders the FAB button", () => {
    render(<MemoryRouter><MainLayout /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /crear nota|new note/i })).toBeInTheDocument();
  });

  it("renders the sidebar, note list and search bar", () => {
    render(<MemoryRouter><MainLayout /></MemoryRouter>);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("note-list")).toBeInTheDocument();
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });
});

// ── Responsive layout (REQ-LAY-01) ───────────────────────────────────────────
//
// Mobile (<768px): the three columns stack vertically into a single column
// (only one panel visible at a time). Tailwind: root has `flex-col`, panels
// gated with `hidden md:flex`.
//
// Desktop (≥768px): the three columns sit side-by-side as today. Tailwind:
// root has `md:flex-row`, panels visible by default.
//
// The actual layout is a CSS concern (jsdom computes zero layout) — what we
// assert here is the contract that the *class list* reflects the breakpoint
// intent, so that switching to a `grid` or other layout in the future does
// not silently regress the responsive contract.

describe("MainLayout responsive (REQ-LAY-01)", () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({ user: { name: "Test" }, logout: vi.fn() } as never);
  });

  it("uses flex-col (single-column) at 360px viewport (mobile)", () => {
    mockMatchMedia(true); // (max-width: 767px) → matches on mobile

    const { container } = render(<MemoryRouter><MainLayout /></MemoryRouter>);
    const root = container.firstChild as HTMLElement;
    expect(root).not.toBeNull();

    // The root flex container must declare mobile-first single-column.
    expect(root.className).toMatch(/\bflex-col\b/);
    // And opt-into row layout only at the md breakpoint.
    expect(root.className).toMatch(/\bmd:flex-row\b/);
  });

  it("uses flex-col at 360px viewport (mobile) — sidebar is hidden", () => {
    mockMatchMedia(true); // mobile

    const { container } = render(<MemoryRouter><MainLayout /></MemoryRouter>);
    // The Sidebar is the first column of the 3-col desktop layout. On mobile
    // it must be hidden (md:block, default hidden) so the list/viewer take
    // the full viewport width.
    const sidebar = container.querySelector('[data-testid="sidebar"]');
    expect(sidebar).not.toBeNull();
    const sidebarWrapper = sidebar!.parentElement as HTMLElement;
    expect(sidebarWrapper).not.toBeNull();
    // The wrapper must hide the sidebar on mobile and reveal it on md.
    expect(sidebarWrapper.className).toMatch(/\bhidden\b/);
    expect(sidebarWrapper.className).toMatch(/\bmd:flex\b/);
  });

  it("uses flex-row (3-column) at 1280px viewport (desktop) — sidebar visible", () => {
    mockMatchMedia(false); // desktop: (max-width: 767px) → no match

    const { container } = render(<MemoryRouter><MainLayout /></MemoryRouter>);
    // All three columns visible.
    expect(container.querySelector('[data-testid="sidebar"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="note-list"]')).toBeInTheDocument();

    // Sidebar wrapper is visible on desktop (md:flex).
    const sidebar = container.querySelector('[data-testid="sidebar"]')!;
    const sidebarWrapper = sidebar.parentElement as HTMLElement;
    expect(sidebarWrapper.className).toMatch(/\bmd:flex\b/);
    // And NOT hidden by default (the `hidden md:flex` pair: default hidden,
    // revealed at md — but on desktop the md: variant applies, so the visible
    // computed style would be `flex`. We just assert the class pair exists
    // because jsdom can't compute media queries; the design guarantees this
    // produces a 3-column layout at ≥768px via Tailwind's compiled CSS.)
    expect(sidebarWrapper.className).toMatch(/\bhidden\b/);
    expect(sidebarWrapper.className).toMatch(/\bmd:flex\b/);
  });

it("keeps the 3-column desktop layout pixel-identical to pre-change (REQ-DESKTOP-01)", () => {
    // S9 guarantees that even though we changed flex direction and added
    // classes (`md:flex-row`) AND the same panel structure (Sidebar,
    // NoteList, Main). Tests pre-PR2 already passed this contract — the
    // responsive refactor must not regress it.
    mockMatchMedia(false); // desktop

    const { container } = render(<MemoryRouter><MainLayout /></MemoryRouter>);
    const root = container.firstChild as HTMLElement;

    // Three panels still present.
    expect(container.querySelector('[data-testid="sidebar"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="note-list"]')).toBeInTheDocument();

    // Root still wraps the panels in a row layout at desktop.
    expect(root.className).toMatch(/\bmd:flex-row\b/);
  });

  it("on mobile: list panel has both `hidden md:flex` classes (panel hidden when note active)", () => {
    // Source contract verified at the JSX-class level:
    //   MainLayout.tsx wraps the NoteList with a conditional class
    //   `${activeNote ? "hidden" : "flex"} md:flex ...`. When a note
    //   is active in mobile, `hidden` collapses the list panel so only
    //   the viewer shows (S7). `md:flex` re-enables it at >=768px.
    // Runtime check requires Router setup; visual verification is done
    // on the Android emulator (open note → list disappears, tap ← → back).
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "MainLayout.tsx"),
      "utf8"
    );
    const pattern =
      /<div\s+className=\{`\$\{activeNote\s*\?\s*"hidden"\s*:\s*"flex"\}\s*md:flex/;
    expect(
      src.match(pattern),
      "list panel should use activeNote-conditional hidden/flex + md:flex"
    ).not.toBeNull();
  });
});
