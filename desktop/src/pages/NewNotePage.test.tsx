import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NewNotePage } from "./NewNotePage";

// Mock the note store: createNote returns a fake note and we observe the call.
vi.mock("../stores/useNoteStore", () => {
  const mockState = {
    createNote: vi.fn(),
    createTab: vi.fn(),
    activeTabId: "tab-1",
    tabs: [{ id: "tab-1", name: "General" }],
  };
  const hook = vi.fn(() => mockState);
  return { useNoteStore: hook };
});

import { useNoteStore } from "../stores/useNoteStore";

/**
 * NewNotePage — PR2 stub that satisfies the locked decision
 * (`/new` is redirect-only — NO TipTap editor on mobile in v1).
 * On mount the page calls `createNote({title:"Nueva nota", content:"", tabId})`
 * and then `navigate('/notes/:id', {replace:true})`. The `replace:true` purges the
 * `/new` entry from the history stack so the Android system back button
 * does NOT return to a stale `/new` view.
 */
describe("NewNotePage (PR2 — shell-redesign-v1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNoteStore).mockReturnValue({
      createNote: vi.fn().mockResolvedValue({ id: "new-1" }),
      createTab: vi.fn().mockResolvedValue({ id: "tab-1", name: "General" }),
      activeTabId: "tab-1",
      tabs: [{ id: "tab-1", name: "General" }],
    } as never);
  });

  it("renders a transient 'Creando nota…' flash while the create call resolves", async () => {
    let resolveCreate: (value: unknown) => void = () => {};
    vi.mocked(useNoteStore).mockReturnValue({
      createNote: vi.fn(
        () => new Promise((resolve) => {
          resolveCreate = resolve;
        }),
      ),
      createTab: vi.fn().mockResolvedValue({ id: "tab-1", name: "General" }),
      activeTabId: "tab-1",
      tabs: [{ id: "tab-1", name: "General" }],
    } as never);

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
    vi.mocked(useNoteStore).mockReturnValue({
      createNote,
      createTab: vi.fn().mockResolvedValue({ id: "tab-1", name: "General" }),
      activeTabId: "tab-1",
      tabs: [{ id: "tab-1", name: "General" }],
    } as never);

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
    vi.mocked(useNoteStore).mockReturnValue({
      createNote,
      createTab: vi.fn().mockResolvedValue({ id: "tab-1", name: "General" }),
      activeTabId: "tab-1",
      tabs: [{ id: "tab-1", name: "General" }],
    } as never);

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
    vi.mocked(useNoteStore).mockReturnValue({
      createNote,
      createTab,
      activeTabId: null,
      tabs: [],
    } as never);

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
