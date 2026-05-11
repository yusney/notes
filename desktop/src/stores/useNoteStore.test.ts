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
        json: async () => ({ items: mockNotes, totalCount: 2, page: 1, pageSize: 20 }),
      });

      useNoteStore.setState({ activeTabId: "tab-1" });
      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.fetchNotes("tab-1");
      });

      expect(result.current.notes).toHaveLength(2);
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
    it("setSearchQuery updates searchQuery", () => {
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.setSearchQuery("react");
      });

      expect(result.current.searchQuery).toBe("react");
    });

    it("filteredNotes returns notes matching searchQuery in title", () => {
      useNoteStore.setState({ notes: mockNotes, searchQuery: "react" });
      const { result } = renderHook(() => useNoteStore());

      const filtered = result.current.filteredNotes();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("React Hooks");
    });

    it("filteredNotes returns notes matching searchQuery in content", () => {
      useNoteStore.setState({ notes: mockNotes, searchQuery: "TS" });
      const { result } = renderHook(() => useNoteStore());

      const filtered = result.current.filteredNotes();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("n2");
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
        json: async () => [],
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
});
