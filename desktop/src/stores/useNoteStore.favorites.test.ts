import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNoteStore } from "./useNoteStore";

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

describe("useNoteStore - new features", () => {
  it("has default sortBy 'creation' and sortOrder 'desc'", () => {
    const state = useNoteStore.getState();
    expect(state.sortBy).toBe("creation");
    expect(state.sortOrder).toBe("desc");
  });

  it("has default isFavoriteOnly false", () => {
    expect(useNoteStore.getState().isFavoriteOnly).toBe(false);
  });

  it("setFavoriteFilter updates isFavoriteOnly", () => {
    useNoteStore.getState().setFavoriteFilter(true);
    expect(useNoteStore.getState().isFavoriteOnly).toBe(true);
  });

  it("toggleFavorite calls PUT and updates note isFavorite", async () => {
    useNoteStore.setState({
      notes: [
        {
          id: "n1",
          title: "Test",
          content: "",
          tabId: "t1",
          userId: "u1",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          tags: [],
          isFavorite: false,
        },
      ],
    });

    vi.mocked(apiClient.put).mockResolvedValueOnce({
      id: "n1",
      isFavorite: true,
      favoritedAt: "2024-01-01",
    });

    await useNoteStore.getState().toggleFavorite("n1");

    expect(apiClient.put).toHaveBeenCalledWith("/api/notes/n1/favorite");
    const updated = useNoteStore.getState().notes.find((n) => n.id === "n1");
    expect(updated?.isFavorite).toBe(true);
  });

  it("fetchNotes includes sortBy, sortOrder, isFavoriteOnly params", async () => {
    useNoteStore.setState({ sortBy: "alphabetical", sortOrder: "asc", isFavoriteOnly: true });
    vi.mocked(apiClient.get).mockResolvedValueOnce([]);

    await useNoteStore.getState().fetchNotes();

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("sortBy=Title")
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("sortOrder=Asc")
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("isFavoriteOnly=true")
    );
  });
});
