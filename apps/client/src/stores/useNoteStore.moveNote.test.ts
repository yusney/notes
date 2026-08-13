/**
 * Tests for useNoteStore.moveNoteToTab.
 *
 * Spec coverage:
 *   - moveNoteToTab calls apiClient.put exactly once with /api/notes/{noteId}/tab + { tabId }
 *   - moveNoteToTab captures source tabId BEFORE the PUT (race-free, in a local
 *     snapshot — committed to lastMove only after the PUT succeeds)
 *   - On PUT success → lastMove is set; fetchNotes(activeTabId) is awaited.
 *   - On PUT failure → lastMove stays null, an error is surfaced in store
 *     state, fetchNotes is NOT called, and the rejection propagates to the
 *     caller (so e.g. UndoMoveToast can show its own undo-specific feedback).
 *   - moveNoteToTab captures destTabName in lastMove for undo toast
 *   - Undo (moveNoteToTab with sourceTabId) re-issues PUT with source tabId
 *   - clearUndo() resets lastMove to null
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useNoteStore } from "./useNoteStore";
import type { Note, Tab } from "../types";

vi.mock("../api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "../api/client";

const mockTabs: Tab[] = [
  { id: "tab-A", name: "Source", userId: "u1", createdAt: "", updatedAt: "" },
  { id: "tab-B", name: "Destination", userId: "u1", createdAt: "", updatedAt: "" },
];

const mockNote: Note = {
  id: "note-1",
  title: "Hello",
  content: "Content",
  tabId: "tab-A",
  userId: "u1",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  tags: [],
};

beforeEach(() => {
  useNoteStore.setState({
    tabs: mockTabs,
    notes: [mockNote],
    visibleNoteIds: ["note-1"],
    activeTabId: "tab-A",
    activeNoteId: null,
    searchQuery: "",
    selectedTagIds: [],
    sortBy: "creation",
    sortOrder: "desc",
    isFavoriteOnly: false,
    isLoading: false,
    error: null,
    page: 1,
    pageSize: 10,
    totalCount: 1,
    totalPages: 1,
    lastMove: null,
  });
  vi.clearAllMocks();
  // Default mocks: PUT returns 204 null; GET (refetch) returns empty page
  (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
  });
});

describe("useNoteStore — moveNoteToTab", () => {
  it("calls apiClient.put exactly once with the tab endpoint and tabId body", async () => {
    await act(async () => {
      await useNoteStore.getState().moveNoteToTab("note-1", "tab-B");
    });

    expect(apiClient.put).toHaveBeenCalledTimes(1);
    expect(apiClient.put).toHaveBeenCalledWith("/api/notes/note-1/tab", { tabId: "tab-B" });
  });

  it("calls fetchNotes(activeTabId) after PUT to reconcile the source list", async () => {
    // First call (after PUT) — fetchNotes path
    await act(async () => {
      await useNoteStore.getState().moveNoteToTab("note-1", "tab-B");
    });

    // fetchNotes internally calls apiClient.get on /api/notes?...
    expect(apiClient.get).toHaveBeenCalled();
    const calledUrl = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/notes");
    expect(calledUrl).toContain("tabId=tab-A"); // source tabId, not dest
  });

  it("captures source tabId locally before the PUT and commits it to lastMove AFTER the PUT resolves", async () => {
    // Race-free contract:
    //   - During the PUT, lastMove is NOT yet committed (no premature toast).
    //   - Immediately after the PUT resolves successfully, lastMove is set
    //     with the source tabId captured BEFORE the PUT (this is the race-free
    //     guarantee: the snapshot was taken at the correct point in time, not
    //     after the PUT mutated state).
    //
    // Strategy: capture lastMove.sourceTabId both during the PUT and right
    // after, and assert: (a) during PUT = null, (b) right after = "tab-A".
    let sourceDuringPut: string | null | undefined = "SENTINEL";
    (apiClient.put as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      sourceDuringPut = useNoteStore.getState().lastMove?.sourceTabId ?? null;
      // Resolve with a microtask gap so we can observe the post-success commit
      await Promise.resolve();
      return null;
    });

    await act(async () => {
      await useNoteStore.getState().moveNoteToTab("note-1", "tab-B");
    });

    // (a) During PUT, lastMove had not been committed yet — we must NEVER
    // surface a "Nota movida a X" toast for a request that may still fail.
    expect(sourceDuringPut).toBeNull();
    // (b) After success, lastMove has the source tabId that was captured
    // BEFORE the PUT (the note was still in tab-A at capture time).
    expect(useNoteStore.getState().lastMove?.sourceTabId).toBe("tab-A");
    expect(useNoteStore.getState().lastMove?.destTabName).toBe("Destination");
    expect(useNoteStore.getState().lastMove?.noteId).toBe("note-1");
  });

  it("stores the destination tab name (looked up from tabs) for the undo toast", async () => {
    await act(async () => {
      await useNoteStore.getState().moveNoteToTab("note-1", "tab-B");
    });

    const lastMove = useNoteStore.getState().lastMove;
    expect(lastMove).not.toBeNull();
    expect(lastMove?.noteId).toBe("note-1");
    expect(lastMove?.sourceTabId).toBe("tab-A");
    expect(lastMove?.destTabName).toBe("Destination");
  });

  it("undo (moveNoteToTab with sourceTabId) issues a PUT with the source tabId", async () => {
    await act(async () => {
      await useNoteStore.getState().moveNoteToTab("note-1", "tab-B");
    });

    // Clear call history to count the undo PUT in isolation
    vi.clearAllMocks();
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
    });

    await act(async () => {
      const lm = useNoteStore.getState().lastMove!;
      await useNoteStore.getState().moveNoteToTab(lm.noteId, lm.sourceTabId);
    });

    expect(apiClient.put).toHaveBeenCalledTimes(1);
    expect(apiClient.put).toHaveBeenCalledWith("/api/notes/note-1/tab", { tabId: "tab-A" });
  });

  it("clearUndo() resets lastMove to null", async () => {
    await act(async () => {
      await useNoteStore.getState().moveNoteToTab("note-1", "tab-B");
    });
    expect(useNoteStore.getState().lastMove).not.toBeNull();

    act(() => {
      useNoteStore.getState().clearUndo();
    });
    expect(useNoteStore.getState().lastMove).toBeNull();
  });

  it("does not mutate lastMove.sourceTabId across moves (each move captures its own source)", async () => {
    // Move 1: tab-A -> tab-B
    await act(async () => {
      await useNoteStore.getState().moveNoteToTab("note-1", "tab-B");
    });
    expect(useNoteStore.getState().lastMove?.sourceTabId).toBe("tab-A");

    // Move 2: simulate note now in tab-B, so its source is B
    useNoteStore.setState({
      notes: [{ ...mockNote, tabId: "tab-B" }],
      activeTabId: "tab-B",
    });

    await act(async () => {
      await useNoteStore.getState().moveNoteToTab("note-1", "tab-A");
    });
    // New move: source is now tab-B (NOT the previous source tab-A)
    expect(useNoteStore.getState().lastMove?.sourceTabId).toBe("tab-B");
    expect(useNoteStore.getState().lastMove?.destTabName).toBe("Source");
  });

  // ── Failure paths (CRITICAL 1 — Misleading "Nota movida" toast) ──────────

  it("PUT failure does NOT set lastMove (no success toast) and surfaces an error in store state", async () => {
    const networkError = new Error("Network down");
    (apiClient.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(networkError);

    await act(async () => {
      try {
        await useNoteStore.getState().moveNoteToTab("note-1", "tab-B");
      } catch {
        // The store may re-throw so callers can react; the test guards against
        // an unhandled rejection but does not require a specific behavior here.
      }
    });

    const state = useNoteStore.getState();
    // CRITICAL: no lastMove commit on failure — would otherwise show a lying
    // "Nota movida a X" toast.
    expect(state.lastMove).toBeNull();
    // Error surfaced in store state (rendered by the existing error banner).
    expect(state.error).toBe("No se pudo mover la nota");
    // PUT was attempted exactly once (we still issued the network call).
    expect(apiClient.put).toHaveBeenCalledTimes(1);
    // fetchNotes must NOT have been called — the PUT failed, so there's
    // nothing to reconcile and we don't want to overwrite the snapshot.
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("PUT failure propagates so callers (e.g. UndoMoveToast) can react with their own feedback", async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("500"));

    await expect(
      useNoteStore.getState().moveNoteToTab("note-1", "tab-B")
    ).rejects.toThrow(/no se pudo mover la nota/i);
  });

  it("PUT success still calls fetchNotes(activeTabId) to reconcile pagination (unchanged behavior)", async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await act(async () => {
      await useNoteStore.getState().moveNoteToTab("note-1", "tab-B");
    });

    expect(apiClient.get).toHaveBeenCalled();
    const calledUrl = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("tabId=tab-A");
  });
});