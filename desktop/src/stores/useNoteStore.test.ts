import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNoteStore } from "./useNoteStore";
import type { Note, Tab } from "../types";

const mockTab: Tab = {
  id: "tab-1",
  name: "Frontend",
  userId: "u1",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

const mockNotes: Note[] = [
  {
    id: "n1",
    title: "React Hooks",
    content: "# React",
    tabId: "tab-1",
    userId: "u1",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    tags: [],
  },
  {
    id: "n2",
    title: "TypeScript",
    content: "# TS",
    tabId: "tab-2",
    userId: "u1",
    createdAt: "2024-01-02",
    updatedAt: "2024-01-02",
    tags: [],
  },
];

beforeEach(() => {
  useNoteStore.setState({
    tabs: [],
    notes: [],
    visibleNoteIds: [],
    activeTabId: null,
    activeNoteId: null,
    searchQuery: "",
    selectedTagIds: [],
    isLoading: false,
    error: null,
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  });
  vi.restoreAllMocks();
});

describe("useNoteStore", () => {
  describe("tabs", () => {
    it("fetchTabs populates tabs from API", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [mockTab],
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.fetchTabs();
      });

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].name).toBe("Frontend");
    });

    it("setActiveTab updates activeTabId", () => {
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.setActiveTab("tab-1");
      });

      expect(result.current.activeTabId).toBe("tab-1");
    });
  });

  describe("notes", () => {
    it("fetchNotes populates notes for the active tab", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: mockNotes, totalCount: 2, page: 1, pageSize: 10 }),
      });

      useNoteStore.setState({ activeTabId: "tab-1" });
      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.fetchNotes("tab-1");
      });

      expect(result.current.notes).toHaveLength(2);
    });

    it("fetchNotes sends page=1 and pageSize=10 query params", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: mockNotes, totalCount: 2, page: 1, pageSize: 10 }),
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.fetchNotes();
      });

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("page=1");
      expect(calledUrl).toContain("pageSize=10");
    });

    it("fetchNotes stores totalCount and totalPages from response", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: mockNotes, totalCount: 25, page: 1, pageSize: 10 }),
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.fetchNotes();
      });

      expect(result.current.totalCount).toBe(25);
      expect(result.current.totalPages).toBe(3);
    });

    it("fetchNotes sets visibleNoteIds to the current page on first load", async () => {
      const page1 = [mockNotes[0]];
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: page1, totalCount: 25, page: 1, pageSize: 10 }),
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.fetchNotes();
      });

      expect(result.current.visibleNoteIds).toEqual(["n1"]);
    });

    // REGRESSION: when the user scrolls past the first page (mobile
    // infinite scroll), fetchNotes must APPEND the new page's ids to
    // visibleNoteIds, not replace them. Otherwise the previous page's
    // notes disappear from the rendered list as soon as the second page
    // loads — which is exactly what the user reported.
    it("fetchNotes APPENDS visibleNoteIds when loading the next page (infinite scroll)", async () => {
      const page1Items = [
        { id: "n1", title: "A", content: "", tabId: "tab-1", userId: "u1", createdAt: "2024-01-01", updatedAt: "2024-01-01", tags: [] },
        { id: "n2", title: "B", content: "", tabId: "tab-1", userId: "u1", createdAt: "2024-01-02", updatedAt: "2024-01-02", tags: [] },
      ];
      const page2Items = [
        { id: "n3", title: "C", content: "", tabId: "tab-1", userId: "u1", createdAt: "2024-01-03", updatedAt: "2024-01-03", tags: [] },
        { id: "n4", title: "D", content: "", tabId: "tab-1", userId: "u1", createdAt: "2024-01-04", updatedAt: "2024-01-04", tags: [] },
      ];
      // First load: page 1 returns n1, n2.
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: page1Items, totalCount: 25, page: 1, pageSize: 10 }),
      });
      const { result } = renderHook(() => useNoteStore());
      await act(async () => {
        await result.current.fetchNotes();
      });
      expect(result.current.visibleNoteIds).toEqual(["n1", "n2"]);

      // Second load: page 2 returns n3, n4.
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: page2Items, totalCount: 25, page: 2, pageSize: 10 }),
      });
      // Bump page to 2 (mirrors what setPage/nextPage does).
      await act(async () => {
        useNoteStore.setState({ page: 2 });
        await result.current.fetchNotes();
      });
      // The first 2 ids are still there; the new 2 are appended.
      expect(result.current.visibleNoteIds).toEqual(["n1", "n2", "n3", "n4"]);
    });

    // REGRESSION: reloading page 1 (after a filter reset) must REPLACE
    // visibleNoteIds, not append — otherwise stale ids from the previous
    // filter would leak into the new list.
    it("fetchNotes REPLACES visibleNoteIds when the new page overlaps (filter reset)", async () => {
      // First load: page 1, n1.
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [mockNotes[0]], totalCount: 1, page: 1, pageSize: 10 }),
      });
      const { result } = renderHook(() => useNoteStore());
      await act(async () => {
        await result.current.fetchNotes();
      });
      expect(result.current.visibleNoteIds).toEqual(["n1"]);

      // Apply a filter (resets visibleNoteIds to []).
      await act(async () => {
        result.current.setSelectedTagIds(["t1"]);
      });
      expect(result.current.visibleNoteIds).toEqual([]);

      // Re-fetch with empty filter: page 1 again returns n1. visibleNoteIds
      // should be exactly ["n1"], not ["n1", "n1"].
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [mockNotes[0]], totalCount: 1, page: 1, pageSize: 10 }),
      });
      await act(async () => {
        await result.current.fetchNotes();
      });
      expect(result.current.visibleNoteIds).toEqual(["n1"]);
    });

    it("fetchNotes sends the current page in URL when page state is set", async () => {
      useNoteStore.setState({ page: 3 });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], totalCount: 0, page: 3, pageSize: 10 }),
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.fetchNotes();
      });

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("page=3");
    });

    it("notesForActiveTab returns only notes matching activeTabId", () => {
      useNoteStore.setState({ notes: mockNotes, activeTabId: "tab-1" });
      const { result } = renderHook(() => useNoteStore());

      const filtered = result.current.notesForActiveTab();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("n1");
    });

    it("notesForActiveTab returns all notes when no activeTabId", () => {
      useNoteStore.setState({ notes: mockNotes, activeTabId: null });
      const { result } = renderHook(() => useNoteStore());

      const filtered = result.current.notesForActiveTab();
      expect(filtered).toHaveLength(2);
    });
  });

  describe("search", () => {
    it("setSearchQuery updates searchQuery and resets page to 1", () => {
      useNoteStore.setState({ page: 4 });
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.setSearchQuery("react");
      });

      expect(result.current.searchQuery).toBe("react");
      expect(result.current.page).toBe(1);
    });

    it("filteredNotes returns notes in visibleNoteIds (server-paginated) for active tab", () => {
      useNoteStore.setState({
        notes: mockNotes,
        visibleNoteIds: ["n1", "n2"],
        activeTabId: null,
      });
      const { result } = renderHook(() => useNoteStore());

      const filtered = result.current.filteredNotes();

      expect(filtered).toHaveLength(2);
    });

    it("filteredNotes only returns notes that are on the current page", () => {
      useNoteStore.setState({
        notes: mockNotes,
        visibleNoteIds: ["n1"],
        activeTabId: null,
      });
      const { result } = renderHook(() => useNoteStore());

      const filtered = result.current.filteredNotes();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("n1");
    });

    it("filteredNotes respects activeTabId filter", () => {
      useNoteStore.setState({
        notes: mockNotes,
        visibleNoteIds: ["n1", "n2"],
        activeTabId: "tab-1",
      });
      const { result } = renderHook(() => useNoteStore());

      const filtered = result.current.filteredNotes();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("n1");
    });
  });

  describe("createNote", () => {
    it("adds new note to store after API call", async () => {
      const newNote: Note = {
        id: "n3",
        title: "New Note",
        content: "",
        tabId: "tab-1",
        userId: "u1",
        createdAt: "2024-01-03",
        updatedAt: "2024-01-03",
        tags: [],
      };
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ id: "n3" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => newNote,
        });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.createNote({ title: "New Note", content: "", tabId: "tab-1" });
      });

      expect(result.current.notes).toHaveLength(1);
      expect(result.current.notes[0].title).toBe("New Note");
    });
  });

  describe("updateNote", () => {
    it("updates existing note in store", async () => {
      useNoteStore.setState({ notes: mockNotes });
      const updated = { ...mockNotes[0], title: "Updated React" };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => null,
      }).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => updated,
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.updateNote("n1", { title: "Updated React" });
      });

      expect(result.current.notes.find((n) => n.id === "n1")?.title).toBe("Updated React");
    });
  });

  describe("tag filter", () => {
    it("setSelectedTagIds updates selectedTagIds", () => {
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.setSelectedTagIds(["t1", "t2"]);
      });

      expect(result.current.selectedTagIds).toEqual(["t1", "t2"]);
    });

    it("toggleTagFilter adds a tag id when not selected", () => {
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.toggleTagFilter("t1");
      });

      expect(result.current.selectedTagIds).toContain("t1");
    });

    it("toggleTagFilter removes a tag id when already selected", () => {
      useNoteStore.setState({ selectedTagIds: ["t1", "t2"] });
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.toggleTagFilter("t1");
      });

      expect(result.current.selectedTagIds).toEqual(["t2"]);
    });

    it("clearTagFilters resets selectedTagIds to empty array", () => {
      useNoteStore.setState({ selectedTagIds: ["t1", "t2"] });
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.clearTagFilters();
      });

      expect(result.current.selectedTagIds).toHaveLength(0);
    });

    it("fetchNotes includes tagIds query params when selectedTagIds is set", async () => {
      useNoteStore.setState({ selectedTagIds: ["t1", "t2"] });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], totalCount: 0, page: 1, pageSize: 10 }),
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.fetchNotes();
      });

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("tagIds=t1");
      expect(calledUrl).toContain("tagIds=t2");
    });
  });

  describe("pagination", () => {
    it("initial state has page=1, pageSize=10, totalCount=0, totalPages=1", () => {
      const state = useNoteStore.getState();
      expect(state.page).toBe(1);
      expect(state.pageSize).toBe(10);
      expect(state.totalCount).toBe(0);
      expect(state.totalPages).toBe(1);
    });

    it("setPage(n) updates page and triggers fetchNotes", async () => {
      useNoteStore.setState({ page: 1, totalCount: 25, totalPages: 3 });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], totalCount: 25, page: 2, pageSize: 10 }),
      });

      await act(async () => {
        await useNoteStore.getState().setPage(2);
      });

      expect(useNoteStore.getState().page).toBe(2);
      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("page=2");
    });

    it("setPage(n) is clamped to [1, totalPages]", async () => {
      useNoteStore.setState({ page: 2, totalCount: 25, totalPages: 3 });
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      await act(async () => {
        await useNoteStore.getState().setPage(0);
      });
      expect(useNoteStore.getState().page).toBe(2);
      expect(fetchSpy).not.toHaveBeenCalled();

      await act(async () => {
        await useNoteStore.getState().setPage(99);
      });
      expect(useNoteStore.getState().page).toBe(2);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("nextPage increments page and fetches", async () => {
      useNoteStore.setState({ page: 1, totalCount: 25, totalPages: 3 });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], totalCount: 25, page: 2, pageSize: 10 }),
      });

      await act(async () => {
        await useNoteStore.getState().nextPage();
      });

      expect(useNoteStore.getState().page).toBe(2);
    });

    it("prevPage decrements page and fetches", async () => {
      useNoteStore.setState({ page: 2, totalCount: 25, totalPages: 3 });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], totalCount: 25, page: 1, pageSize: 10 }),
      });

      await act(async () => {
        await useNoteStore.getState().prevPage();
      });

      expect(useNoteStore.getState().page).toBe(1);
    });

    it("nextPage is a no-op on last page", async () => {
      useNoteStore.setState({ page: 3, totalCount: 25, totalPages: 3 });
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      await act(async () => {
        await useNoteStore.getState().nextPage();
      });
      expect(useNoteStore.getState().page).toBe(3);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("prevPage is a no-op on first page", async () => {
      useNoteStore.setState({ page: 1, totalCount: 25, totalPages: 3 });
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      await act(async () => {
        await useNoteStore.getState().prevPage();
      });
      expect(useNoteStore.getState().page).toBe(1);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("resetPage sets page to 1", () => {
      useNoteStore.setState({ page: 4 });
      useNoteStore.getState().resetPage();
      expect(useNoteStore.getState().page).toBe(1);
    });

    it("setActiveTab resets page to 1", () => {
      useNoteStore.setState({ page: 4 });
      useNoteStore.getState().setActiveTab("tab-1");
      expect(useNoteStore.getState().page).toBe(1);
    });

    it("setActiveTab is idempotent — calling with the active id does NOT bump page or reset activeNoteId", () => {
      // Defense-in-depth for REQ-TAB-04 "Tapping the active tab is
      // idempotent": a repeat tap from the drawer must not churn
      // pagination state or clear the currently-open note.
      useNoteStore.setState({
        activeTabId: "tab-1",
        activeNoteId: "note-9",
        page: 3,
      });
      useNoteStore.getState().setActiveTab("tab-1");
      expect(useNoteStore.getState().page).toBe(3);
      expect(useNoteStore.getState().activeNoteId).toBe("note-9");
    });

    it("setSortBy resets page to 1", () => {
      useNoteStore.setState({ page: 4 });
      useNoteStore.getState().setSortBy("alphabetical");
      expect(useNoteStore.getState().page).toBe(1);
    });

    it("setSortOrder resets page to 1", () => {
      useNoteStore.setState({ page: 4 });
      useNoteStore.getState().setSortOrder("asc");
      expect(useNoteStore.getState().page).toBe(1);
    });

    it("setSelectedTagIds resets page to 1", () => {
      useNoteStore.setState({ page: 4 });
      useNoteStore.getState().setSelectedTagIds(["t1"]);
      expect(useNoteStore.getState().page).toBe(1);
    });

    it("toggleTagFilter resets page to 1", () => {
      useNoteStore.setState({ page: 4 });
      useNoteStore.getState().toggleTagFilter("t1");
      expect(useNoteStore.getState().page).toBe(1);
    });

    it("clearTagFilters resets page to 1", () => {
      useNoteStore.setState({ page: 4, selectedTagIds: ["t1"] });
      useNoteStore.getState().clearTagFilters();
      expect(useNoteStore.getState().page).toBe(1);
    });

    it("setFavoriteFilter resets page to 1", () => {
      useNoteStore.setState({ page: 4 });
      useNoteStore.getState().setFavoriteFilter(true);
      expect(useNoteStore.getState().page).toBe(1);
    });

    it("setPage does NOT reset filters (only changes page)", async () => {
      useNoteStore.setState({
        page: 1,
        totalCount: 25,
        totalPages: 3,
        searchQuery: "react",
        selectedTagIds: ["t1"],
        sortBy: "alphabetical",
      });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], totalCount: 25, page: 2, pageSize: 10 }),
      });

      await act(async () => {
        await useNoteStore.getState().setPage(2);
      });

      const state = useNoteStore.getState();
      expect(state.searchQuery).toBe("react");
      expect(state.selectedTagIds).toEqual(["t1"]);
      expect(state.sortBy).toBe("alphabetical");
    });

    it("fetchNotes stores totalPages=1 when totalCount=0", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], totalCount: 0, page: 1, pageSize: 10 }),
      });

      await act(async () => {
        await useNoteStore.getState().fetchNotes();
      });

      expect(useNoteStore.getState().totalPages).toBe(1);
    });

    it("fetchNotes stores totalPages=1 when totalCount fits in one page", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: mockNotes,
          totalCount: 2,
          page: 1,
          pageSize: 10,
        }),
      });

      await act(async () => {
        await useNoteStore.getState().fetchNotes();
      });

      expect(useNoteStore.getState().totalPages).toBe(1);
    });
  });
});
