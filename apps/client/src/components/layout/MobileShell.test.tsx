import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { MobileShell } from "./MobileShell";
import { useNoteStore } from "../../stores/useNoteStore";

/**
 * Tests for MobileShell (PR2 — shell-redesign-v1).
 *
 * MobileShell is the `md:hidden` sibling inside `MainLayout`'s flex
 * tree. It composes the mobile-only chrome (AppBar + Outlet + BottomNav)
 * and orchestrates the SideSheet drawer via a hamburger trigger. PR2
 * wires the store-override behaviour that keeps the wide viewport
 * list↔main split-view from fighting the mobile single-column.
 */

// Mock the note store so we can observe setState calls without
// depending on the real Zustand instance. The hook returns an empty
// default; the setState/getState surface lets us seed activeNoteId.
//
// `tabs-mobile-grouping` adds a new <EspaciosSection/> consumer inside
// the SideSheet, which reads `tabs`, `activeTabId`, and `notes` and
// invokes `setActiveTab` / `createTab`. Seed those too so the mobile
// tests can render the drawer without crashing on `tabs.length`.
vi.mock("../../stores/useNoteStore", () => {
  const mockState: Record<string, unknown> = {
    activeNoteId: null,
    tabs: [],
    activeTabId: null,
    notes: [],
    setActiveTab: vi.fn(),
    createTab: vi.fn(),
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => Record<string, unknown> }).getState = () => mockState;
  (hook as unknown as { setState: (partial: Record<string, unknown>) => void }).setState = (partial) =>
    Object.assign(mockState, partial);
  return { useNoteStore: hook };
});

function renderShell(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <MobileShell />
    </MemoryRouter>,
  );
}

function renderShellWithRoutes(initialPath: string, testId = "child") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<MobileShell />}>
          <Route path="/" element={<div data-testid={testId}>home</div>} />
          <Route path="/notes/:id" element={<div data-testid={testId}>note viewer</div>} />
          <Route path="/new" element={<div data-testid={testId}>new note</div>} />
          <Route path="/search" element={<div data-testid={testId}>search</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("MobileShell (PR2 — shell-redesign-v1)", () => {
  beforeEach(() => {
    vi.mocked(useNoteStore.getState as never);
    (useNoteStore as unknown as { getState: () => { activeNoteId: string | null } }).getState = () => ({
      activeNoteId: null,
    });
    (useNoteStore as unknown as { setState: (partial: { activeNoteId: string | null }) => void }).setState =
      (partial) => {
        const prev = (useNoteStore as unknown as { getState: () => { activeNoteId: string | null } }).getState();
        Object.assign(prev, partial);
      };
  });

  it("renders an AppBar + BottomNav inside a `md:hidden` root", () => {
    const { container } = renderShell("/");
    expect(screen.getByTestId("app-bar")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegación principal/i })).toBeInTheDocument();
    const shell = container.querySelector('[data-testid="mobile-shell"]');
    expect(shell).not.toBeNull();
    expect(shell!.className).toMatch(/\bmd:hidden\b/);
  });

  it("renders the AppBar + main + BottomNav as direct flex siblings (h-screen flex-col)", () => {
    const { container } = renderShell("/");
    const shell = container.querySelector('[data-testid="mobile-shell"]') as HTMLElement;
    expect(shell).not.toBeNull();
    expect(shell.className).toMatch(/\bh-screen\b/);
    expect(shell.className).toMatch(/\bflex\b/);
    expect(shell.className).toMatch(/\bflex-col\b/);
  });

  it("renders an <Outlet> as the <main> child (route content renders through)", () => {
    renderShellWithRoutes("/", "outlet-child");
    expect(screen.getByTestId("outlet-child")).toHaveTextContent("home");
  });

  it("renders the hamburger button on the / home route", () => {
    renderShell("/");
    expect(screen.getByTestId("mobile-menu-button")).toBeInTheDocument();
  });

  it("renders a back chevron on non-home routes (e.g. /notes/:id)", () => {
    renderShell("/notes/abc");
    expect(screen.getByTestId("mobile-back-button")).toBeInTheDocument();
  });

  it("renders the hamburger on /search", () => {
    renderShell("/search");
    expect(screen.getByTestId("mobile-menu-button")).toBeInTheDocument();
  });

  it("renders the hamburger on /new", () => {
    renderShell("/new");
    expect(screen.getByTestId("mobile-menu-button")).toBeInTheDocument();
  });

  it("clicking the hamburger opens the SideSheet (dialog visible)", async () => {
    const user = userEvent.setup();
    renderShell("/");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("mobile-menu-button"));
    expect(screen.getByRole("dialog", { name: /menú lateral/i })).toBeInTheDocument();
  });

  it("navigating to a different route auto-closes the open SideSheet", async () => {
    const user = userEvent.setup();
    // Render with a Routes tree so navigation actually changes the URL.
    render(
      <MemoryRouter initialEntries={["/"]}>
        <MobileShell />
        <Routes>
          <Route path="/search" element={<div data-testid="search-page">search</div>} />
        </Routes>
      </MemoryRouter>,
    );
    // Open the sheet
    await user.click(screen.getByTestId("mobile-menu-button"));
    expect(screen.getByRole("dialog", { name: /menú lateral/i })).toBeInTheDocument();
    // Tap the search nav link — that triggers pathname change → sheet closes
    await user.click(screen.getByRole("link", { name: /buscar/i }));
    expect(screen.queryByRole("dialog", { name: /menú lateral/i })).not.toBeInTheDocument();
  });

  it("back chevron on /notes/:id navigates deterministically to /", async () => {
    const user = userEvent.setup();
    let lastPath = "/notes/abc";
    function PathProbe() {
      const loc = useLocation();
      lastPath = loc.pathname;
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/search", "/notes/abc"]} initialIndex={1}>
        <Routes>
          <Route element={<MobileShell />}>
            <Route path="/" element={<div>home</div>} />
            <Route path="/search" element={<div>search</div>} />
            <Route path="/notes/:id" element={<div>note</div>} />
          </Route>
        </Routes>
        <PathProbe />
      </MemoryRouter>,
    );
    expect(lastPath).toBe("/notes/abc");
    await user.click(screen.getByTestId("mobile-back-button"));
    expect(lastPath).toBe("/");
  });

  it("back chevron on non-note secondary routes still uses browser history", async () => {
    const user = userEvent.setup();
    let lastPath = "/search";
    function PathProbe() {
      const loc = useLocation();
      lastPath = loc.pathname;
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/", "/search"]} initialIndex={1}>
        <Routes>
          <Route element={<MobileShell />}>
            <Route path="/" element={<div>home</div>} />
            <Route path="/search" element={<div>search</div>} />
          </Route>
        </Routes>
        <PathProbe />
      </MemoryRouter>,
    );
    expect(lastPath).toBe("/search");
    await user.click(screen.getByTestId("mobile-back-button"));
    expect(lastPath).toBe("/");
  });

  it("overrides store-driven activeNoteId on non-home mobile routes (Outlet wins)", () => {
    // Seed the store with an activeNoteId BEFORE the shell mounts; PR2 must
    // call setState({ activeNoteId: null }) on mount of a non-home route so
    // the wide-viewport list↔main swap doesn't fight the mobile Outlet.
    const setStateSpy = vi.fn();
    (useNoteStore as unknown as { setState: typeof setStateSpy }).setState = setStateSpy;

    act(() => {
      renderShell("/notes/abc");
    });

    // On /notes/:id we must have cleared the activeNoteId at least once.
    const calls = setStateSpy.mock.calls;
    const clearedCall = calls.find(
      (c) =>
        typeof c[0] === "object" &&
        c[0] !== null &&
        "activeNoteId" in (c[0] as Record<string, unknown>) &&
        (c[0] as { activeNoteId: unknown }).activeNoteId === null,
    );
    expect(clearedCall, "MobileShell must reset activeNoteId on non-home route").toBeDefined();
  });

  it("does NOT touch activeNoteId when the route is /", () => {
    const setStateSpy = vi.fn();
    (useNoteStore as unknown as { setState: typeof setStateSpy }).setState = setStateSpy;

    act(() => {
      renderShell("/");
    });

    // On / we do NOT proactively clear — wide-viewport layout may want to keep
    // its activeNoteId to render the empty state at the same place. (The
    // existing effect in MainLayout already does setActiveNote(null) on /.)
    const calls = setStateSpy.mock.calls;
    const clearedCall = calls.find(
      (c) =>
        typeof c[0] === "object" &&
        c[0] !== null &&
        "activeNoteId" in (c[0] as Record<string, unknown>) &&
        (c[0] as { activeNoteId: unknown }).activeNoteId === null,
    );
    expect(clearedCall).toBeUndefined();
  });
});
