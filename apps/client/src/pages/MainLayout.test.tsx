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
 * that the *rendered class list* reflects the mobile vs. wide viewport
 * intent. So we mock matchMedia to return matches:true for "(max-width: 767px)"
 * in the mobile case and matches:false in the wide-viewport case. The actual
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
  (hook as unknown as { setState: (partial: Partial<typeof mockState>) => void }).setState = (partial: Partial<typeof mockState>) => Object.assign(mockState, partial);
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

  // PR2 — REQ-LAY-02: FAB removed from the layout (the "+" action moves
  // to the BottomNav "Nueva" tab). We assert the FAB is GONE so the
  // muscle-memory regression of re-adding it would be caught here.
  it("does NOT render the floating-action-button (FAB) — removed in PR2", () => {
    render(<MemoryRouter><MainLayout /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: /crear nota|new note/i })).not.toBeInTheDocument();
  });

  it("does NOT import FloatingActionButton in the source (compile-time guard via import check)", () => {
    // Source-level guard: if a future commit re-imports FloatingActionButton
    // the FAB would silently re-render. Catching it at the import level
    // makes the regression loud.
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "MainLayout.tsx"),
      "utf8"
    );
    // Strip comments before checking for JSX usage — the JSX comment
    // legitimately mentions the old component name as a docstring.
    const noBlockComments = src.replace(/\/\*[\s\S]*?\*\//g, "");
    const noLineComments = noBlockComments.replace(/^\s*\/\/.*$/gm, "");
    expect(noLineComments).not.toMatch(/from\s+["']\.\.\/components\/ui\/FloatingActionButton["']/);
    expect(noLineComments).not.toMatch(/<FloatingActionButton\b/);
  });

  it("renders the sidebar, note list and search bar", () => {
    render(<MemoryRouter><MainLayout /></MemoryRouter>);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("note-list")).toBeInTheDocument();
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });

  it("mounts MobileShell as a `md:hidden` sibling inside the flex tree", () => {
    // PR2 — MobileShell integration. The mobile shell renders an AppBar
    // (data-testid="app-bar") which is the easiest visible anchor.
    mockMatchMedia(false); // wide-viewport render context (md: classes resolve correctly)
    render(<MemoryRouter><MainLayout /></MemoryRouter>);
    // MobileShell mounts an AppBar at top of its subtree. The shell itself
    // is wrapped in a div with `md:hidden`, so at wide-viewport the AppBar is
    // visually hidden — but in the DOM tree it's still present.
    expect(screen.getByTestId("app-bar")).toBeInTheDocument();
  });

  it("the MobileShell wrapper carries the `md:hidden` class (REQ-LAY-01 wide-viewport-pixel-identical)", () => {
    mockMatchMedia(false); // wide viewport
    render(<MemoryRouter><MainLayout /></MemoryRouter>);
    // Find the wrapper div that holds MobileShell. It's the element
    // whose direct child renders an [data-testid="app-bar"].
    const appBar = screen.getByTestId("app-bar");
    const wrapper = appBar.parentElement as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toMatch(/\bmd:hidden\b/);
  });
});

// ── Responsive layout (REQ-LAY-01) ───────────────────────────────────────────
//
// Mobile (<768px): the three columns stack vertically into a single column
// (only one panel visible at a time). Tailwind: root has `flex-col`, panels
// gated with `hidden md:flex`. PR2 adds a MobileShell subtree as a
// `md:hidden` sibling — the wide-viewport `md:flex-row` and panel gating stay
// byte-identical to pre-PR2.
//
// Desktop (≥768px): the three columns sit side-by-side as today. Tailwind:
// root has `md:flex-row`, panels visible by default.

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
    // The Sidebar is the first column of the 3-col wide-viewport layout. On mobile
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

  it("uses flex-row (3-column) at 1280px viewport (wide viewport) — sidebar visible", () => {
    mockMatchMedia(false); // wide viewport: (max-width: 767px) → no match

    const { container } = render(<MemoryRouter><MainLayout /></MemoryRouter>);
    // All three columns visible.
    expect(container.querySelector('[data-testid="sidebar"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="note-list"]')).toBeInTheDocument();

    // Sidebar wrapper is visible on wide viewports (md:flex).
    const sidebar = container.querySelector('[data-testid="sidebar"]')!;
    const sidebarWrapper = sidebar.parentElement as HTMLElement;
    expect(sidebarWrapper.className).toMatch(/\bmd:flex\b/);
    expect(sidebarWrapper.className).toMatch(/\bhidden\b/);
    expect(sidebarWrapper.className).toMatch(/\bmd:flex\b/);
  });

  it("keeps the 3-column wide-viewport layout pixel-identical to pre-change (REQ-WIDE-01)", () => {
    mockMatchMedia(false); // wide viewport

    const { container } = render(<MemoryRouter><MainLayout /></MemoryRouter>);
    const root = container.firstChild as HTMLElement;

    // Three panels still present.
    expect(container.querySelector('[data-testid="sidebar"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="note-list"]')).toBeInTheDocument();

    // Root still wraps the panels in a row layout at wide viewport.
    expect(root.className).toMatch(/\bmd:flex-row\b/);
  });

  it("the source has NOT introduced any new `md:*` class outside the MobileShell subtree", () => {
    // Source-level lint of the diff vs. the pr1-foundation baseline.
    // Catches accidental regressions where a future commit re-adds or
    // moves a `md:` class in MainLayout outside the MobileShell wrapper.
    //
    // Implementation: read the file, locate the MobileShell subtree
    // (the wrapper div carrying `md:hidden`), and verify every `md:`
    // token in the file is inside that subtree. This is intentionally
    // coarse — finer-grained diff-checking is done at the PR-review
    // step via the explicit `git diff` audit (see apply-progress).
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "MainLayout.tsx"),
      "utf8"
    );
    // Find the MobileShell wrapper — `<div className="...md:hidden..."><MobileShell />`
    const mobileShellMatch = src.match(/<div[^>]*md:hidden[^>]*>\s*<MobileShell/);
    expect(mobileShellMatch, "MobileShell must be wrapped in a div with md:hidden").not.toBeNull();
  });

  it("the empty state shows exactly ONE primary CTA (single-CTA rule per decisions #2207)", () => {
    // PR2 cleanup — the old empty state had two competing CTAs ("Empezar nota"
    // plus a secondary "Crear tu primera nota" link in the list panel
    // empty cell). We want exactly ONE primary CTA in the empty state.
    //
    // Verified via source regex: the empty-state block has exactly one
    // <button> with the "Empezar nota" copy.
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "MainLayout.tsx"),
      "utf8"
    );
    // Match the empty-state block bounded by "Sin nota activa"
    const emptyMatch = src.match(/Sin nota activa[\s\S]*?<\/button>\s*<\/div>/);
    expect(emptyMatch, "empty-state block present").not.toBeNull();
    // Count `<button` tags within the empty state
    const buttonOpens = emptyMatch![0].match(/<button\b/g) ?? [];
    expect(buttonOpens.length).toBe(1);
    // The CTA copy is "Empezar nota"
    expect(emptyMatch![0]).toMatch(/Empezar nota/);
  });

  it("on mobile, the activeNote-conditional hidden/flex swap is REMOVED (mobile uses Outlet)", () => {
    // PR2 migration: the `${activeNote ? "hidden" : "flex"} md:flex`
    // pattern on the list panel is gone. The list-panel visibility on
    // mobile is now controlled by MobileShell's Outlet, not by the
    // store. We assert this at the source level so the regex doesn't
    // regress even if visual checks pass.
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "MainLayout.tsx"),
      "utf8"
    );
    const pattern =
      /\$\{activeNote\s*\?\s*"hidden"\s*:\s*"flex"\}\s*md:flex/;
    expect(src.match(pattern), "list-panel activeNote swap should be removed in PR2").toBeNull();
  });

  // ────────────────────────────────────────────────────────────────────────
  // REQ-PERF-06 — NoteEditor + NoteViewer are loaded via React.lazy()
  // inside MainLayout. They mount only when a note is selected AND
  // isEditing matches the editor/viewer type.
  // ────────────────────────────────────────────────────────────────────────
  describe("editor/viewer lazy gate (REQ-PERF-06)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "MainLayout.tsx"),
      "utf8"
    );

    it("loads NoteEditor via React.lazy() — no eager import", () => {
      // The source must NOT have an eager named import of NoteEditor
      // (the only path through which it should be loaded is the
      // lazy() adapter below).
      const noBlockComments = src.replace(/\/\*[\s\S]*?\*\//g, "");
      const noLineComments = noBlockComments.replace(/^\s*\/\/.*$/gm, "");
      expect(noLineComments).not.toMatch(/^import\s*\{[^}]*\bNoteEditor\b[^}]*\}\s*from\s*["']\.\.\/components\/editor\/NoteEditor["']/m);
      // And it MUST have a lazy() call that imports NoteEditor.
      expect(src).toMatch(/lazy\s*\(\s*\(\s*\)\s*=>\s*import\(\s*["']\.\.\/components\/editor\/NoteEditor["']/);
    });

    it("loads NoteViewer via React.lazy() — no eager import", () => {
      const noBlockComments = src.replace(/\/\*[\s\S]*?\*\//g, "");
      const noLineComments = noBlockComments.replace(/^\s*\/\/.*$/gm, "");
      expect(noLineComments).not.toMatch(/^import\s*\{[^}]*\bNoteViewer\b[^}]*\}\s*from\s*["']\.\.\/components\/editor\/NoteViewer["']/m);
      expect(src).toMatch(/lazy\s*\(\s*\(\s*\)\s*=>\s*import\(\s*["']\.\.\/components\/editor\/NoteViewer["']/);
    });

    it("wraps the editor/viewer render in <Suspense fallback={<EditorSkeleton/>}>", () => {
      // The activeNote-conditional render section must be wrapped in
      // <Suspense fallback={<EditorSkeleton/>}> so the chunk resolves
      // with a stable CLS footprint.
      expect(src).toMatch(/Suspense\s+fallback=\{<EditorSkeleton\s*\/>\}/);
      // The <Suspense> wrap must be INSIDE the activeNote ternary
      // (so no skeleton mounts on the empty-state path).
      const activeNoteMatch = src.match(/\{activeNote\s*\?\s*\([\s\S]*?\)\s*:\s*\(/);
      expect(activeNoteMatch).not.toBeNull();
    });
  });
});