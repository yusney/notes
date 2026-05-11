/**
 * Notes favorites flow integration test.
 *
 * Flow: load notes → toggle favorite → filter by favorites → sort notes
 *       Exercises the full store action chain, verifying end-to-end state changes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNoteStore } from "./useNoteStore";
import type { Note } from "../types";

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

const makeNote = (id: string, title: string, isFavorite = false): Note => ({
  id,
  title,
  content: "Content",
  tabId: "tab-1",
  userId: "user-1",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  tags: [],
  isFavorite,
});

beforeEach(() => {
  useNoteStore.setState({
    tabs: [],
    notes: [],
    activeTabId: null,
    activeNoteId: null,
    searchQuery: "",
    selectedTagIds: [],
    sortBy: "creation",
    sortOrder: "desc",
    isFavoriteOnly: false,
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe("Notes favorites complete flow (store integration)", () => {
  it("fetchNotes → toggleFavorite → setFavoriteFilter — state reflects full flow", async () => {
    // ── 1. Fetch notes (3 notes, none favorited) ──────────────────────────────
    const notes = [
      makeNote("n1", "Alpha Note"),
      makeNote("n2", "Beta Note"),
      makeNote("n3", "Gamma Note"),
    ];
    vi.mocked(apiClient.get).mockResolvedValueOnce(notes);

    await useNoteStore.getState().fetchNotes();

    expect(useNoteStore.getState().notes).toHaveLength(3);
    expect(useNoteStore.getState().notes.every((n) => !n.isFavorite)).toBe(true);

    // ── 2. Toggle n1 as favorite ──────────────────────────────────────────────
    vi.mocked(apiClient.put).mockResolvedValueOnce({ id: "n1", isFavorite: true, favoritedAt: "2024-01-01" });

    await useNoteStore.getState().toggleFavorite("n1");

    const n1 = useNoteStore.getState().notes.find((n) => n.id === "n1");
    expect(n1?.isFavorite).toBe(true);

    // ── 3. Toggle n3 as favorite ──────────────────────────────────────────────
    vi.mocked(apiClient.put).mockResolvedValueOnce({ id: "n3", isFavorite: true, favoritedAt: "2024-01-01" });

    await useNoteStore.getState().toggleFavorite("n3");

    const n3 = useNoteStore.getState().notes.find((n) => n.id === "n3");
    expect(n3?.isFavorite).toBe(true);

    // ── 4. Enable favorite filter → re-fetch with isFavoriteOnly=true ─────────
    useNoteStore.getState().setFavoriteFilter(true);
    expect(useNoteStore.getState().isFavoriteOnly).toBe(true);

    const favNotes = [makeNote("n1", "Alpha Note", true), makeNote("n3", "Gamma Note", true)];
    vi.mocked(apiClient.get).mockResolvedValueOnce(favNotes);

    await useNoteStore.getState().fetchNotes();

    const filtered = useNoteStore.getState().filteredNotes();
    expect(filtered).toHaveLength(2);
    expect(filtered.map((n) => n.title)).toContain("Alpha Note");
    expect(filtered.map((n) => n.title)).toContain("Gamma Note");
    expect(filtered.map((n) => n.title)).not.toContain("Beta Note");

    // ── 5. Verify API was called with isFavoriteOnly param ────────────────────
    expect(apiClient.get).toHaveBeenLastCalledWith(
      expect.stringContaining("isFavoriteOnly=true")
    );
  });

  it("toggleFavorite twice (toggle off) → isFavorite returns to false", async () => {
    // Start with a favorited note in state
    useNoteStore.setState({
      notes: [makeNote("n1", "Test Note", true)],
    });

    // Toggle OFF
    vi.mocked(apiClient.put).mockResolvedValueOnce({ id: "n1", isFavorite: false, favoritedAt: null });

    await useNoteStore.getState().toggleFavorite("n1");

    const n1 = useNoteStore.getState().notes.find((n) => n.id === "n1");
    expect(n1?.isFavorite).toBe(false);
  });
});
