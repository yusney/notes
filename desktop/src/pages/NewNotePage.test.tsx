import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NewNotePage } from "./NewNotePage";

/**
 * Mock the note store as a Zustand-like hook with getState().
 *
 * NewNotePage reads `activeTabId`/`tabs` via `useNoteStore.getState()`
 * (a snapshot — NOT reactive) to avoid the self-cancel bug (#2314):
 * the mutation re-renders the component before the post-create
 * `navigate()` runs. The selector form (`useNoteStore(s => s.x)`) is
 * used for `createNote` / `createTab` which are stable action refs.
 *
 * Each test sets up `_state` with the store contents before rendering.
 * The hook either resolves a selector or returns the whole state.
 */
let _state: Record<string, unknown> = {};
vi.mock("../stores/useNoteStore", () => {
  const hook = vi.fn((selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(_state) : _state,
  ) as never as ReturnType<typeof vi.fn> & { getState: () => Record<string, unknown> };
  hook.getState = () => _state;
  return { useNoteStore: hook as never };
});

import { useNoteStore } from "../stores/useNoteStore";

function setStore(overrides: Record<string, unknown>) {
  _state = {
    createNote: vi.fn().mockResolvedValue({ id: "new-1" }),
    createTab: vi.fn().mockResolvedValue({ id: "tab-1", name: "General" }),
    activeTabId: "tab-1",
    tabs: [{ id: "tab-1", name: "General" }],
    ...overrides,
  };
  // Refresh the hook implementation to read the current `_state`.
  vi.mocked(useNoteStore).mockImplementation(
    ((selector?: (s: Record<string, unknown>) => unknown) =>
      selector ? selector(_state) : _state) as never,
  );
}

describe("NewNotePage (PR2 — shell-redesign-v1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStore({});
  });

  it("renders a transient 'Creando nota…' flash while the create call resolves", async () => {
    let resolveCreate: (value: unknown) => void = () => {};
    setStore({
      createNote: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      ),
    });

    render(
      <MemoryRouter initialEntries={["/new"]}>
        <Routes>
          <Route path="/new" element={<NewNotePage />} />
          <Route path="/" element={<div data-testid="home">home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/creando nota/i)).toBeInTheDocument();
    // Resolve and flush microtasks
    await act(async () => {
      resolveCreate({ id: "new-1" });
    });
    await waitFor(() => {
      expect(screen.queryByText(/creando nota/i)).not.toBeInTheDocument();
    });
  });

  it("calls createNote on mount with a fresh empty note in the active tab", async () => {
    const createNote = vi.fn().mockResolvedValue({ id: "new-2" });
    setStore({ createNote });

    render(
      <MemoryRouter initialEntries={["/new"]}>
        <Routes>
          <Route path="/new" element={<NewNotePage />} />
          <Route path="/" element={<div data-testid="home">home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(createNote).toHaveBeenCalledTimes(1);
    });
    const callArg = createNote.mock.calls[0]?.[0] as { title: string; content: string; tabId: string } | undefined;
    expect(callArg).toBeDefined();
    expect(callArg?.title).toBe("Nueva nota");
    expect(callArg?.content).toBe("");
    expect(callArg?.tabId).toBe("tab-1");
  });

  it("navigates to the created note with replace:true after creation", async () => {
    const createNote = vi.fn().mockResolvedValue({ id: "new-3" });
    setStore({ createNote });

    render(
      <MemoryRouter initialEntries={["/new"]}>
        <Routes>
          <Route path="/new" element={<NewNotePage />} />
          <Route path="/notes/:id" element={<div data-testid="created-note">created note</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("created-note")).toBeInTheDocument();
    });
  });

  it("creates the default General tab first when the account has no tabs", async () => {
    const createTab = vi.fn().mockResolvedValue({ id: "tab-general", name: "General" });
    const createNote = vi.fn().mockResolvedValue({ id: "new-first" });
    setStore({ createNote, createTab, activeTabId: null, tabs: [] });

    render(
      <MemoryRouter initialEntries={["/new"]}>
        <Routes>
          <Route path="/new" element={<NewNotePage />} />
          <Route path="/notes/:id" element={<div data-testid="created-note">created note</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(createTab).toHaveBeenCalledWith("General");
      expect(createNote).toHaveBeenCalledWith({
        title: "Nueva nota",
        content: "",
        tabId: "tab-general",
      });
    });
  });
});