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

const PAGE_SIZE_DEFAULT = 10;

/**
 * Monotonic fetch sequence token — protects against stale-response
 * races. Every `fetchNotes` call captures `++fetchSeq` before the API
 * round-trip; if a newer fetch has started by the time the response
 * arrives, the older one bails out before writing state. This prevents
 * rapid tab switches / page changes from letting an older fetch
 * overwrite the current tab's notes (audit #2308).
 */
let fetchSeq = 0;

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

function normalizePagedResponse(
  response: ApiNoteDto[] | ApiPagedNotesResponse,
  fallbackPageSize: number
): { items: ApiNoteDto[]; totalCount: number; page: number; pageSize: number } {
  if (Array.isArray(response)) {
    return {
      items: response,
      totalCount: response.length,
      page: 1,
      pageSize: fallbackPageSize,
    };
  }
  return response;
}

function normalizeNotesResponse(response: ApiNoteDto[] | ApiPagedNotesResponse, existingNotes: Note[]): Note[] {
  const items = Array.isArray(response) ? response : response.items;
  return items.map((note) => normalizeNote(note, existingNotes.find((existing) => existing.id === note.id)));
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
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;

  // Undo move toast
  lastMove: { noteId: string; sourceTabId: string; destTabName: string } | null;

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
  moveNoteToTab: (noteId: string, tabId: string) => Promise<void>;
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

  // Pagination
  setPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  resetPage: () => void;

  // Undo move
  clearUndo: () => void;
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
  page: 1,
  pageSize: PAGE_SIZE_DEFAULT,
  totalCount: 0,
  totalPages: 1,
  lastMove: null,

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

  setActiveTab: (tabId) => {
    // Idempotent: tapping the already-active tab is a no-op so a repeat
    // tap from the drawer doesn't churn pagination state. See
    // REQ-TAB-04 "Tapping the active tab is idempotent".
    if (get().activeTabId === tabId) return;
    set({ activeTabId: tabId, activeNoteId: null, page: 1, visibleNoteIds: [] });
    // Re-fetch notes for the newly selected tab. Without this the
    // accumulated `notes` array still holds the previous tab's rows
    // and `filteredNotes()` returns stale data (or empty results if
    // the backend filters by tab server-side and the previous fetch
    // only covered one tab). The fire-and-forget `void` is intentional
    // — callers don't need to await the round-trip before continuing.
    void get().fetchNotes(tabId ?? undefined);
  },

  fetchNotes: async (tabId) => {
    set({ isLoading: true, error: null });
    // Capture this fetch's sequence. If a newer fetch starts while the
    // API call is in flight, our response is stale and we bail out
    // before committing state (audit #2308).
    const mySeq = ++fetchSeq;
    try {
      const params = new URLSearchParams();
      if (tabId) params.set("tabId", tabId);
      const { selectedTagIds, sortBy, sortOrder, isFavoriteOnly, searchQuery, notes, page, pageSize, visibleNoteIds } = get();
      if (searchQuery.trim()) params.set("query", searchQuery.trim());
      for (const id of selectedTagIds) params.append("tagIds", id);
      params.set("sortBy", toApiSortBy(sortBy));
      params.set("sortOrder", toApiSortOrder(sortOrder));
      if (isFavoriteOnly) params.set("isFavoriteOnly", "true");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const query = params.toString();
      const url = query ? `/api/notes?${query}` : "/api/notes";
      // The react-doctor `async-defer-await` rule (false positive) suggests
      // moving the await AFTER the `if (mySeq !== fetchSeq) return` guard.
      // We cannot: the guard's whole purpose is to detect OTHER fetches
      // that started WHILE we awaited this one — moving the await first
      // would defeat the stale-response protection (audit #2308).
      // eslint-disable-next-line react-doctor/async-defer-await
      const response = await apiClient.get<ApiNoteDto[] | ApiPagedNotesResponse>(url);
      const paged = normalizePagedResponse(response, pageSize);
      const fetchedNotes = normalizeNotesResponse(paged, notes);
      const fetchedIds = fetchedNotes.map((note) => note.id);
      const fetchedById = new Map(fetchedNotes.map((note) => [note.id, note]));
      const totalPages = Math.max(1, Math.ceil(paged.totalCount / paged.pageSize));

      // Stale-response guard (audit #2308): if a newer fetch started
      // while we were awaiting, discard this response entirely. Writing
      // a stale fetch's notes/visibleNoteIds would overwrite the current
      // tab/page with the old tab's data.
      if (mySeq !== fetchSeq) return;

      // Infinite-scroll accumulation:
      //   - When the new page's ids don't overlap with visibleNoteIds AND
      //     the requested page is > 1, APPEND the new ids. This is the
      //     "nextPage" case (mobile infinite scroll).
      //   - Otherwise (initial load, filter change, or explicit pagination
      //     navigation), REPLACE the list with just the fetched ids.
      // The dedupe happens via the id set: a page that overlaps with the
      // tail of visibleNoteIds is treated as a refresh, not an append.
      const existingIds = new Set(visibleNoteIds);
      const allNew = fetchedIds.every((id) => !existingIds.has(id));
      const isAppend = allNew && paged.page > 1;
      const nextVisibleNoteIds = isAppend
        ? [...visibleNoteIds, ...fetchedIds]
        : fetchedIds;

      set({
        // When replacing (page 1, filter/tab change, refresh), wipe the
        // accumulated notes array and use ONLY the fetched ones. The old
        // merge logic (`...notes.map(...) + ...fetchedNotes.filter(...)`)
        // kept notes from previous sessions/tabs, inflating the count
        // (e.g. user A's 55 + user B's 48 = 103 visible in /search).
        // On append (infinite scroll nextPage), keep accumulating.
        notes: isAppend
          ? [
              ...notes.map((note) => fetchedById.get(note.id) ?? note),
              ...fetchedNotes.filter((note) => !notes.some((existing) => existing.id === note.id)),
            ]
          : fetchedNotes,
        visibleNoteIds: nextVisibleNoteIds,
        page: paged.page,
        pageSize: paged.pageSize,
        totalCount: paged.totalCount,
        totalPages,
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
      // Keep pagination totals in sync so setPage/totalPages next/prev
      // checks use accurate counts (audit #2310).
      totalCount: s.totalCount + 1,
      totalPages: Math.max(1, Math.ceil((s.totalCount + 1) / s.pageSize)),
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
      // Keep pagination totals in sync so setPage/totalPages next/prev
      // checks use accurate counts (audit #2310).
      totalCount: Math.max(0, s.totalCount - 1),
      totalPages: Math.max(1, Math.ceil(Math.max(0, s.totalCount - 1) / s.pageSize)),
    }));
  },

  moveNoteToTab: async (noteId, tabId) => {
    // Capture source BEFORE the PUT so undo has the correct previous tab,
    // even if the PUT later mutates server state. We hold the snapshot in a
    // local closure and only commit it to `lastMove` after the PUT resolves
    // successfully — committing earlier would surface a "Nota movida a X"
    // toast for moves that ultimately fail (network/404/500).
    const { notes, tabs, activeTabId } = get();
    const note = notes.find((n) => n.id === noteId);
    const sourceTabId = note?.tabId ?? "";
    const destTab = tabs.find((t) => t.id === tabId);
    const destTabName = destTab?.name ?? "";

    try {
      await apiClient.put(`/api/notes/${noteId}/tab`, { tabId });
    } catch {
      // Surface to the existing error banner (rendered in MainLayout) and
      // re-throw so callers (e.g. UndoMoveToast) can react with context-
      // specific feedback ("No se pudo deshacer el movimiento"). We do NOT
      // commit `lastMove` here — that would be a misleading success toast.
      set({ error: "No se pudo mover la nota" });
      throw new Error("No se pudo mover la nota");
    }

    // PUT succeeded → safe to surface the undo toast + reconcile pagination.
    set({ lastMove: { noteId, sourceTabId, destTabName } });
    await get().fetchNotes(activeTabId ?? undefined);
  },

  clearUndo: () => set({ lastMove: null }),

  toggleFavorite: async (noteId) => {
    const updated = await apiClient.put<ApiFavoriteResponse>(`/api/notes/${noteId}/favorite`);
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? { ...n, isFavorite: updated.isFavorite, favoritedAt: updated.favoritedAt }
          : n
      ),
      // If the favorite-only filter is active and the note was just
      // unfavorited, drop it from the visible list so it disappears
      // immediately instead of lingering as a stale row (audit #2309).
      visibleNoteIds:
        s.isFavoriteOnly && !updated.isFavorite
          ? s.visibleNoteIds.filter((id) => id !== noteId)
          : s.visibleNoteIds,
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

  setSearchQuery: (query) => set({ searchQuery: query, page: 1, visibleNoteIds: [] }),

  notesForActiveTab: () => {
    const { notes, activeTabId } = get();
    if (!activeTabId) return notes;
    return notes.filter((n) => n.tabId === activeTabId);
  },

  filteredNotes: () => {
    const { visibleNoteIds } = get();
    const activeTabNotes = get().notesForActiveTab();

    if (visibleNoteIds.length === 0) return activeTabNotes;

    const visibleIdSet = new Set(visibleNoteIds);
    return activeTabNotes.filter((note) => visibleIdSet.has(note.id));
  },

  setSelectedTagIds: (ids) => set({ selectedTagIds: ids, page: 1, visibleNoteIds: [] }),

  toggleTagFilter: (id) =>
    set((s) => ({
      selectedTagIds: s.selectedTagIds.includes(id)
        ? s.selectedTagIds.filter((t) => t !== id)
        : [...s.selectedTagIds, id],
      page: 1,
      visibleNoteIds: [],
    })),

  clearTagFilters: () => set({ selectedTagIds: [], page: 1, visibleNoteIds: [] }),

  setSortBy: (sortBy) => set({ sortBy, page: 1, visibleNoteIds: [] }),
  setSortOrder: (sortOrder) => set({ sortOrder, page: 1, visibleNoteIds: [] }),
  setFavoriteFilter: (isFavoriteOnly) => set({ isFavoriteOnly, page: 1, visibleNoteIds: [] }),

  setPage: async (page) => {
    const { totalPages, page: currentPage, activeTabId } = get();
    if (page < 1 || page > totalPages || page === currentPage) return;
    set({ page });
    // Forward activeTabId so the server fetch is tab-scoped, not a
    // global fetch that the client then wrongly filters (audit #2307).
    await get().fetchNotes(activeTabId ?? undefined);
  },

  nextPage: async () => {
    await get().setPage(get().page + 1);
  },

  prevPage: async () => {
    await get().setPage(get().page - 1);
  },

  resetPage: () => set({ page: 1, visibleNoteIds: [] }),
}));

if (typeof window !== "undefined" && (import.meta as any).env?.DEV) {
  (window as unknown as { __noteStore?: typeof useNoteStore }).__noteStore = useNoteStore;
}
