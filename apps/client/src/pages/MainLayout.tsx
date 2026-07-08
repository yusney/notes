import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Sidebar } from "../components/layout/Sidebar";
import { MobileShell } from "../components/layout/MobileShell";
import { NoteList } from "../components/notes/NoteList";
import { SearchBar } from "../components/notes/SearchBar";
import { ShareWarningDialog } from "../components/share/ShareWarningDialog";
import { CreateTabDialog } from "../components/CreateTabDialog";
import { TagFilter } from "../components/notes/TagFilter";
import { ActiveFiltersBar } from "../components/notes/ActiveFiltersBar";
import { UndoMoveToast } from "../components/notes/UndoMoveToast";
import { EditorSkeleton } from "../components/editor/EditorSkeleton";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useNoteStore } from "../stores/useNoteStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useTagStore } from "../stores/useTagStore";
import { usePreferencesStore } from "../stores/usePreferencesStore";

// REQ-PERF-06 — NoteEditor + NoteViewer are loaded via React.lazy() so
// the TipTap bundle (~620 KB raw / ~207 KB gzip) only lands when the
// user actually selects a note to edit/view. The chunk cache means
// toggling isEditing true→false→true re-uses the same chunk.
// Pages are named-exported, so use the .then adapter form.
const NoteEditor = lazy(() =>
  import("../components/editor/NoteEditor").then((m) => ({ default: m.NoteEditor }))
);
const NoteViewer = lazy(() =>
  import("../components/editor/NoteViewer").then((m) => ({ default: m.NoteViewer }))
);

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const {
    tabs,
    notes,
    activeTabId,
    activeNoteId,
    searchQuery,
    selectedTagIds,
    sortBy,
    isFavoriteOnly,
    isLoading,
    error,
    page,
    pageSize,
    totalCount,
    fetchNotes,
    fetchNote,
    createTab,
    createNote,
    updateNote,
    deleteNote,
    moveNoteToTab,
    toggleFavorite,
    getShareWarning,
    exportNotes,
    setActiveTab,
    setActiveNote,
    setSearchQuery,
    setSelectedTagIds,
    setSortBy,
    setFavoriteFilter,
    setPage,
    filteredNotes,
  } = useNoteStore();
  const { tags, fetchTags } = useTagStore();

  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Reset active note when arriving at "/" via the in-viewer back button.
  // The viewer navigates to "/" with `replace: true` from
  // NoteViewer.tsx; without this effect the list stays hidden behind the
  // still-open note because activeNoteId persists across routes.
  // We also reset on initial mount so the home shows the list, not the
  // last note the user had open before navigating away.
  //
  // The react-doctor `no-mutable-in-deps` rule flags `location.pathname`
  // as a mutable global — false positive. `useLocation()` subscribes the
  // component to route changes; the effect re-runs whenever the
  // component re-renders because the route changed.
  // eslint-disable-next-line react-doctor/no-mutable-in-deps
  useEffect(() => {
    if (location.pathname === "/") {
      setActiveNote(null);
    }
  }, [location.pathname, setActiveNote]);

  // ── Init: load saved preferences first, then fetch data + tags ─────────────
  // Only run when authenticated — prevents 401 storms on login page
  useEffect(() => {
    if (!isAuthenticated) return;
    async function init() {
      // ⚠️ Clear stale data from previous users BEFORE fetching new data.
      // useNoteStore.fetchNotes() MERGES existing `notes` with the
      // server response (line ~283 of useNoteStore.ts) — without this
      // reset, notes from a previous user session bleed into the new
      // user's view (e.g. user A had 55 + user B has 48 = 103 visible).
      useNoteStore.setState({
        notes: [],
        visibleNoteIds: [],
        tabs: [],
        activeTabId: null,
        activeNoteId: null,
        page: 1,
        totalPages: 1,
        totalCount: 0,
        searchQuery: "",
        selectedTagIds: [],
        isFavoriteOnly: false,
      });
      useTagStore.setState({ tags: [] });
      await usePreferencesStore.getState().fetchPreferences();
      const prefs = usePreferencesStore.getState();
      useNoteStore.setState({
        sortBy: prefs.sortBy ?? "creation",
        sortOrder: prefs.sortOrder ?? "desc",
      });
      // Now fetch with correct sort preferences
      // fetchTabs and fetchTags are independent — run in parallel
      await Promise.all([
        useNoteStore.getState().fetchTabs(),
        useTagStore.getState().fetchTags(),
      ]);
      // fetchNotes runs after fetchTabs so the active tab is available
      await useNoteStore.getState().fetchNotes();
    }
    init();
  }, [isAuthenticated]);

  const [deleteWarning, setDeleteWarning] = useState<{
    noteId: string;
    count: number;
  } | null>(null);

  const [isCreateTabDialogOpen, setIsCreateTabDialogOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const visibleNotes = filteredNotes();
  // Leer la nota activa desde el array completo del store (no desde filteredNotes)
  // para garantizar que se usa la versión con contenido completo cargada por fetchNote.
  const activeNote = activeNoteId
    ? (notes.find((n) => n.id === activeNoteId) ?? null)
    : null;

  const activeTabName = activeTabId
    ? (tabs.find((t) => t.id === activeTabId)?.name ?? null)
    : null;

  function handleClearFilters() {
    setActiveTab(null);
    setSearchQuery("");
    setSelectedTagIds([]);
    setFavoriteFilter(false);
    fetchNotes();
  }

  async function handleCreateTab() {
    setIsCreateTabDialogOpen(true);
  }

  async function handleCreateTabSubmit(name: string) {
    setIsCreateTabDialogOpen(false);
    await createTab(name);
  }

  async function handleCreateNote() {
    let tabId = activeTabId ?? tabs[0]?.id;
    if (!tabId) {
      const tab = await createTab("General");
      tabId = tab.id;
      setActiveTab(tab.id);
    }
    if (!tabId) return;
    await createNote({ title: "Nueva nota", content: "", tabId });
    setIsEditing(true);
  }

  async function handleSelectNote(noteId: string) {
    setActiveNote(noteId);
    setIsEditing(false);
    await fetchNote(noteId);
  }

  async function handleSaveNote(data: { title: string; content: string; tagNames?: string[] }) {
    if (!activeNoteId) return;
    await updateNote(activeNoteId, data);
    if (data.tagNames) await fetchTags();
  }

  async function handleSaveAndExit(data: { title: string; content: string; tagNames?: string[] }) {
    if (!activeNoteId) return;
    await updateNote(activeNoteId, data);
    if (data.tagNames) await fetchTags();
    setIsEditing(false);
  }

  async function handleTagFilterChange(ids: string[]) {
    setSelectedTagIds(ids);
    await fetchNotes(activeTabId ?? undefined);
  }

  async function handleSearchNotes(query: string) {
    setSearchQuery(query);
    await fetchNotes(activeTabId ?? undefined);
  }

  async function handleSortChange(sort: typeof sortBy) {
    setSortBy(sort);
    // Persist the preference
    usePreferencesStore.getState().updatePreferences({ sortBy: sort }).catch(() => {});
    await fetchNotes(activeTabId ?? undefined);
  }

  async function handleFavoriteFilterToggle() {
    setFavoriteFilter(!isFavoriteOnly);
    await fetchNotes(activeTabId ?? undefined);
  }

  useKeyboardShortcuts({
    onCreateNote: handleCreateNote,
    onSave: () => { /* auto-save handles this */ },
    onFocusSearch: () => searchRef.current?.focus(),
    onExport: exportNotes,
  });

  // ── DnD wiring ───────────────────────────────────────────────────────
  // PointerSensor for mouse/touch drag; KeyboardSensor for a11y
  // (space to pick up, arrows to navigate, enter to drop, escape to cancel).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return; // dropped outside any droppable
    const noteId = String(active.id);
    const destTabId = String(over.id);
    if (!noteId || !destTabId) return;
    // moveNoteToTab now sets the store error and re-throws on PUT failure.
    // Swallow at the call site so we don't get an unhandled rejection in
    // the synthetic event handler; the user already sees the error banner.
    moveNoteToTab(noteId, destTabId).catch(() => {
      /* surfaced via store.error → MainLayout banner */
    });
  }

  async function handleDeleteNote(noteId: string) {
    const warning = await getShareWarning(noteId);
    if (warning.hasActiveShares) {
      setDeleteWarning({ noteId, count: warning.count });
    } else {
      await deleteNote(noteId);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteWarning) return;
    await deleteNote(deleteWarning.noteId);
    setDeleteWarning(null);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {/*
        Responsive root (REQ-LAY-01):
        - Mobile (<768px): flex-col → the desktop branch's three panels
          collapse (Sidebar is `hidden md:flex`, list/main swap to hidden
          on mobile). The new MobileShell subtree (last sibling) carries
          `md:hidden` so it's invisible at desktop and the only visible
          surface at <768px. MobileShell contains the AppBar + Outlet
          (rendering MobileNotePage / NewNotePage / MobileSearchPage) +
          BottomNav + SideSheet.
        - Desktop (≥768px): md:flex-row → identical 3-column layout to
          pre-PR2 (REQ-DESKTOP-01 / S9 visual-regression baseline).
          MobileShell subtree is `md:hidden` and contributes zero pixels
          to the desktop viewport.

        PR2 wiring: PR2 also DROPS the FAB (`<FloatingActionButton />`)
        per REQ-LAY-02. The "+" action moves to the BottomNav "Nueva"
        tab inside MobileShell (also reaches the same thumb zone on
        mobile). On desktop, the existing "+" inside the list panel
        header stays.
      */}
      <div className="relative flex h-screen flex-col md:flex-row overflow-hidden bg-surface text-text-primary pt-[env(safe-area-inset-top)] md:pt-0">
        <div className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-surface-elevated md:text-text-primary">
          <Sidebar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSelect={(id) => {
              setActiveTab(id);
              fetchNotes(id);
            }}
            onCreateTab={handleCreateTab}
            userName={user?.name}
            onLogout={logout}
          />
        </div>

        {/*
          Desktop-only list panel — PR2 removes the activeNote-conditional
          visibility swap. Pre-PR2 the list was `hidden` on mobile when a
          note was active; in PR2 the mobile surface is owned by
          MobileShell (added as a `md:hidden` sibling below). The desktop
          list is hidden on mobile via `hidden md:flex` and the panel
          takes its full desktop width via `md:w-80`.
        */}
        <div className="hidden md:flex w-full min-w-0 shrink-0 flex-col border-b md:border-b-0 md:border-r border-border bg-surface overflow-hidden md:h-full md:w-80 md:min-w-[200px]">
          <div className="border-b border-border p-4 pb-3">
            <SearchBar onSearch={handleSearchNotes} />
          </div>
          <div className="border-b border-border px-4 py-2">
            <TagFilter tags={tags} selectedTagIds={selectedTagIds} onChange={handleTagFilterChange} />
          </div>
          <ActiveFiltersBar
            resultCount={visibleNotes.length}
            activeTabName={activeTabName}
            searchQuery={searchQuery}
            selectedTags={tags.filter((t) => selectedTagIds.includes(t.id))}
            isFavoriteOnly={isFavoriteOnly}
            sortBy={sortBy}
            onClearTab={() => { setActiveTab(null); fetchNotes(); }}
            onClearSearch={() => { setSearchQuery(""); fetchNotes(activeTabId ?? undefined); }}
            onRemoveTag={(tagId) => { handleTagFilterChange(selectedTagIds.filter((id) => id !== tagId)); }}
            onClearFavorites={() => { setFavoriteFilter(false); fetchNotes(activeTabId ?? undefined); }}
            onClearAll={handleClearFilters}
          />
          {error && (
            <div role="alert" className="mx-4 mb-2 border border-danger bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-text-secondary">Cargando notas…</div>
          ) : (
            <NoteList
              notes={visibleNotes}
              tabs={tabs}
              activeNoteId={activeNoteId}
              onNoteSelect={handleSelectNote}
              onCreateNote={handleCreateNote}
              onDeleteNote={handleDeleteNote}
              onToggleFavorite={toggleFavorite}
              enableDrag={true}
              onMoveToTab={(noteId, tabId) => {
                // Same swallow-and-surface-error pattern as handleDragEnd:
                // the store sets `error` and re-throws; we catch so a failed
                // move from the menu doesn't generate an unhandled rejection
                // in this synthetic event handler.
                moveNoteToTab(noteId, tabId).catch(() => {
                  /* surfaced via store.error → MainLayout banner */
                });
              }}
              searchQuery={searchQuery}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              isFavoriteOnly={isFavoriteOnly}
              onFavoriteFilterToggle={handleFavoriteFilterToggle}
              pagination={{
                page,
                pageSize,
                totalCount,
                onPageChange: (p) => { void setPage(p); },
              }}
            />
          )}
        </div>

        <main className="hidden md:block md:min-w-0 md:flex-1 md:overflow-hidden md:h-full">
          {activeNote ? (
            <Suspense fallback={<EditorSkeleton />}>
              {isEditing ? (
                <NoteEditor
                  key={activeNote.id}
                  note={activeNote}
                  availableTags={tags}
                  onSave={handleSaveNote}
                  onSaveAndExit={handleSaveAndExit}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <div data-testid={`editor-${activeNote.id}`} className="h-full">
                  <NoteViewer note={activeNote} onEdit={() => setIsEditing(true)} />
                </div>
              )}
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center bg-surface p-10 text-text-secondary">
              <div className="max-w-md border border-border bg-surface-elevated/75 p-8 text-center backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Sin nota activa</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">Elegí una nota o empezá una nueva.</h1>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  Usá la búsqueda, tags, favoritos y espacios para encontrar contexto rápido sin romper el foco de escritura.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNote}
                  className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
                >
                  Empezar nota
                </button>
              </div>
            </div>
          )}
        </main>

        <ShareWarningDialog
          isOpen={deleteWarning !== null}
          activeShareCount={deleteWarning?.count ?? 0}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteWarning(null)}
        />

        <CreateTabDialog
          open={isCreateTabDialogOpen}
          onClose={() => setIsCreateTabDialogOpen(false)}
          onCreate={handleCreateTabSubmit}
        />

        {/*
          PR2 — Mobile shell subtree (REQ-LAY-01 / shell-redesign-v1).
          Wrapped in `md:hidden` so it contributes zero pixels at
          desktop viewports. Inside, MobileShell owns the AppBar,
          Outlet (mobile drill-down routes), BottomNav, and SideSheet.
          The MobileShell itself also calls `useNoteStore.setState({ activeNoteId: null })`
          on non-home mobile routes so the desktop store-driven
          list↔main swap doesn't fight the mobile single-column.
        */}
        <div className="md:hidden h-full w-full">
          <MobileShell />
        </div>

        <UndoMoveToast />
      </div>
    </DndContext>
  );
}
