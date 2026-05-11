import { create } from "zustand";
import type { Note, Tab } from "../types";
import { apiClient } from "../api/client";

const SORT_BY = {
  Creation: "creation",
  Modification: "modification",
  Alphabetical: "alphabetical",
} as const;

const SORT_ORDER = {
  Asc: "asc",
  Desc: "desc",
} as const;

export type SortBy = (typeof SORT_BY)[keyof typeof SORT_BY];
export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

interface EntityCreatedResponse {
  id: string;
}

interface ApiTagDto {
  id: string;
  name: string;
}

interface ApiNoteDto {
  id: string;
  tabId: string;
  title: string;
  content?: string;
  language?: string;
  createdAt: string;
  updatedAt: string | null;
  tags?: ApiTagDto[];
  isFavorite?: boolean;
  favoritedAt?: string | null;
}

interface ApiPagedNotesResponse {
  items: ApiNoteDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface ApiFavoriteResponse {
  id: string;
  isFavorite: boolean;
  favoritedAt: string | null;
}

function normalizeNote(note: ApiNoteDto, fallback?: Note): Note {
  const fallbackTags = fallback?.tags ?? [];

  return {
    id: note.id,
    tabId: note.tabId,
    title: note.title,
    content: note.content ?? fallback?.content ?? "",
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    tags: (note.tags ?? fallbackTags).map((tag) => ({
      id: tag.id,
      name: tag.name,
      userId: fallbackTags.find((fallbackTag) => fallbackTag.id === tag.id)?.userId ?? "",
      createdAt: fallbackTags.find((fallbackTag) => fallbackTag.id === tag.id)?.createdAt ?? "",
    })),
    isFavorite: note.isFavorite ?? fallback?.isFavorite ?? false,
    favoritedAt: note.favoritedAt ?? fallback?.favoritedAt ?? null,
  };
}

function normalizeNotesResponse(response: ApiNoteDto[] | ApiPagedNotesResponse, existingNotes: Note[]): Note[] {
  const notes = Array.isArray(response) ? response : response.items;
  return notes.map((note) => normalizeNote(note, existingNotes.find((existing) => existing.id === note.id)));
}

function toApiSortBy(sortBy: SortBy): string {
  if (sortBy === SORT_BY.Modification) return "UpdatedAt";
  if (sortBy === SORT_BY.Alphabetical) return "Title";
  return "CreatedAt";
}

function toApiSortOrder(sortOrder: SortOrder): string {
  return sortOrder === SORT_ORDER.Asc ? "Asc" : "Desc";
}

interface NoteStore {
  tabs: Tab[];
  notes: Note[];
  visibleNoteIds: string[];
  activeTabId: string | null;
  activeNoteId: string | null;
  searchQuery: string;
  selectedTagIds: string[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  isFavoriteOnly: boolean;
  isLoading: boolean;
  error: string | null;

  // Tab actions
  fetchTabs: () => Promise<void>;
  createTab: (name: string) => Promise<Tab>;
  updateTab: (id: string, name: string) => Promise<void>;
  deleteTab: (id: string) => Promise<void>;
  setActiveTab: (tabId: string | null) => void;

  // Note actions
  fetchNotes: (tabId?: string) => Promise<void>;
  createNote: (data: { title: string; content: string; tabId: string }) => Promise<Note>;
  fetchNote: (id: string) => Promise<Note>;
  updateNote: (id: string, data: Partial<Pick<Note, "title" | "content" | "tabId">> & { tagNames?: string[] }) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  toggleFavorite: (noteId: string) => Promise<void>;
  getShareWarning: (noteId: string) => Promise<{ hasActiveShares: boolean; count: number }>;
  exportNotes: () => Promise<void>;
  setActiveNote: (noteId: string | null) => void;

  // Search
  setSearchQuery: (query: string) => void;
  notesForActiveTab: () => Note[];
  filteredNotes: () => Note[];

  // Tag filter
  setSelectedTagIds: (ids: string[]) => void;
  toggleTagFilter: (id: string) => void;
  clearTagFilters: () => void;

  // Sort & favorite filter
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  setFavoriteFilter: (isFavoriteOnly: boolean) => void;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  tabs: [],
  notes: [],
  visibleNoteIds: [],
  activeTabId: null,
  activeNoteId: null,
  searchQuery: "",
  selectedTagIds: [],
  sortBy: "creation",
  sortOrder: "desc",
  isFavoriteOnly: false,
  isLoading: false,
  error: null,

  fetchTabs: async () => {
    set({ isLoading: true, error: null });
    try {
      const tabs = await apiClient.get<Tab[]>("/api/tabs");
      set({ tabs, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: "Error al cargar tabs" });
    }
  },

  createTab: async (name) => {
    const { id } = await apiClient.post<EntityCreatedResponse>("/api/tabs", { name });
    const tab: Tab = {
      id,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
    set((s) => ({ tabs: [...s.tabs, tab] }));
    return tab;
  },

  updateTab: async (id, name) => {
    const updated = await apiClient.put<Tab>(`/api/tabs/${id}`, { name });
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? updated : t)) }));
  },

  deleteTab: async (id) => {
    await apiClient.delete(`/api/tabs/${id}`);
    set((s) => ({
      tabs: s.tabs.filter((t) => t.id !== id),
      notes: s.notes.filter((n) => n.tabId !== id),
      visibleNoteIds: s.visibleNoteIds.filter(
        (visibleId) => s.notes.find((note) => note.id === visibleId)?.tabId !== id
      ),
      activeTabId: s.activeTabId === id ? null : s.activeTabId,
    }));
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId, activeNoteId: null }),

  fetchNotes: async (tabId) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (tabId) params.set("tabId", tabId);
      const { selectedTagIds, sortBy, sortOrder, isFavoriteOnly, searchQuery, notes } = get();
      if (searchQuery.trim()) params.set("query", searchQuery.trim());
      for (const id of selectedTagIds) params.append("tagIds", id);
      params.set("sortBy", toApiSortBy(sortBy));
      params.set("sortOrder", toApiSortOrder(sortOrder));
      if (isFavoriteOnly) params.set("isFavoriteOnly", "true");
      const query = params.toString();
      const url = query ? `/api/notes?${query}` : "/api/notes";
      const response = await apiClient.get<ApiNoteDto[] | ApiPagedNotesResponse>(url);
      const fetchedNotes = normalizeNotesResponse(response, notes);
      const fetchedIds = fetchedNotes.map((note) => note.id);
      const fetchedById = new Map(fetchedNotes.map((note) => [note.id, note]));

      set({
        notes: [
          ...notes.map((note) => fetchedById.get(note.id) ?? note),
          ...fetchedNotes.filter((note) => !notes.some((existing) => existing.id === note.id)),
        ],
        visibleNoteIds: fetchedIds,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, error: "Error al cargar notas" });
    }
  },

  createNote: async (data) => {
    const { id } = await apiClient.post<EntityCreatedResponse>("/api/notes", {
      ...data,
      language: "markdown",
    });
    const note = await apiClient.get<ApiNoteDto>(`/api/notes/${id}`).then(normalizeNote);
    set((s) => ({
      notes: s.notes.some((existing) => existing.id === note.id)
        ? s.notes.map((existing) => (existing.id === note.id ? note : existing))
        : [...s.notes, note],
      visibleNoteIds: [note.id, ...s.visibleNoteIds.filter((existingId) => existingId !== note.id)],
      activeNoteId: note.id,
    }));
    return note;
  },

  fetchNote: async (id) => {
    const note = await apiClient.get<ApiNoteDto>(`/api/notes/${id}`).then(normalizeNote);
    set((s) => ({
      notes: s.notes.some((existing) => existing.id === id)
        ? s.notes.map((existing) => (existing.id === id ? { ...existing, ...note } : existing))
        : [...s.notes, note],
      visibleNoteIds: s.visibleNoteIds.includes(id) ? s.visibleNoteIds : [id, ...s.visibleNoteIds],
      activeNoteId: id,
    }));
    return note;
  },

  updateNote: async (id, data) => {
    const current = get().notes.find((note) => note.id === id);
    await apiClient.put<null>(`/api/notes/${id}`, {
      title: data.title ?? current?.title ?? "Nueva nota",
      content: data.content ?? current?.content ?? "",
      tagNames: data.tagNames ?? (current?.tags ?? []).map((t) => t.name),
    });
    const updated = await apiClient.get<ApiNoteDto>(`/api/notes/${id}`).then(normalizeNote);
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...updated } : n)) }));
  },

  deleteNote: async (id) => {
    await apiClient.delete(`/api/notes/${id}`);
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      visibleNoteIds: s.visibleNoteIds.filter((visibleId) => visibleId !== id),
      activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
    }));
  },

  toggleFavorite: async (noteId) => {
    const updated = await apiClient.put<ApiFavoriteResponse>(`/api/notes/${noteId}/favorite`);
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? { ...n, isFavorite: updated.isFavorite, favoritedAt: updated.favoritedAt }
          : n
      ),
    }));
  },

  getShareWarning: async (noteId) => {
    const result = await apiClient.get<{ hasActiveShares: boolean; count: number }>(
      `/api/notes/${noteId}/share-warning`
    );
    return result;
  },

  exportNotes: async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    await apiClient.downloadBlob("/api/notes/export", `notes-export-${timestamp}.zip`);
  },

  setActiveNote: (noteId) => set({ activeNoteId: noteId }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  notesForActiveTab: () => {
    const { notes, activeTabId } = get();
    if (!activeTabId) return notes;
    return notes.filter((n) => n.tabId === activeTabId);
  },

  filteredNotes: () => {
    const { visibleNoteIds, searchQuery } = get();
    const activeTabNotes = get().notesForActiveTab();

    if (visibleNoteIds.length === 0) {
      if (!searchQuery.trim()) return activeTabNotes;
      const q = searchQuery.toLowerCase();
      return activeTabNotes.filter(
        (note) =>
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q)
      );
    }

    const visibleIdSet = new Set(visibleNoteIds);
    return activeTabNotes.filter((note) => visibleIdSet.has(note.id));
  },

  setSelectedTagIds: (ids) => set({ selectedTagIds: ids }),

  toggleTagFilter: (id) =>
    set((s) => ({
      selectedTagIds: s.selectedTagIds.includes(id)
        ? s.selectedTagIds.filter((t) => t !== id)
        : [...s.selectedTagIds, id],
    })),

  clearTagFilters: () => set({ selectedTagIds: [] }),

  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setFavoriteFilter: (isFavoriteOnly) => set({ isFavoriteOnly }),
}));
