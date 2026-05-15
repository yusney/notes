import { useEffect, useRef, useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { NoteList } from "../components/notes/NoteList";
import { NoteEditor } from "../components/editor/NoteEditor";
import { NoteViewer } from "../components/editor/NoteViewer";
import { SearchBar } from "../components/notes/SearchBar";
import { ShareWarningDialog } from "../components/share/ShareWarningDialog";
import { FloatingActionButton } from "../components/ui/FloatingActionButton";
import { TagFilter } from "../components/notes/TagFilter";
import { ActiveFiltersBar } from "../components/notes/ActiveFiltersBar";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useNoteStore } from "../stores/useNoteStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useTagStore } from "../stores/useTagStore";
import { usePreferencesStore } from "../stores/usePreferencesStore";

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
    fetchNotes,
    fetchNote,
    createTab,
    createNote,
    updateNote,
    deleteNote,
    toggleFavorite,
    getShareWarning,
    exportNotes,
    setActiveTab,
    setActiveNote,
    setSearchQuery,
    setSelectedTagIds,
    setSortBy,
    setFavoriteFilter,
    filteredNotes,
  } = useNoteStore();
  const { tags, fetchTags } = useTagStore();

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Init: load saved preferences first, then fetch data + tags ─────────────
  useEffect(() => {
    async function init() {
      await usePreferencesStore.getState().fetchPreferences();
      const prefs = usePreferencesStore.getState();
      useNoteStore.setState({
        sortBy: prefs.sortBy ?? "creation",
        sortOrder: prefs.sortOrder ?? "desc",
      });
      // Now fetch with correct sort preferences
      await useNoteStore.getState().fetchTabs();
      await useNoteStore.getState().fetchNotes();
      await useTagStore.getState().fetchTags();
    }
    init();
  }, []);

  const [deleteWarning, setDeleteWarning] = useState<{
    noteId: string;
    count: number;
  } | null>(null);

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
    const name = prompt("Nombre de la nueva tab:");
    if (name?.trim()) {
      await createTab(name.trim());
    }
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
    <div className="relative flex h-screen overflow-hidden bg-surface text-text-primary">
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

      <div className="flex w-80 min-w-[200px] shrink flex-col border-r border-border bg-surface">
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
          <div className="flex flex-1 items-center justify-center text-sm text-text-secondary">Cargando notas...</div>
        ) : (
          <NoteList
            notes={visibleNotes}
            activeNoteId={activeNoteId}
            onNoteSelect={handleSelectNote}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            onToggleFavorite={toggleFavorite}
            searchQuery={searchQuery}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            isFavoriteOnly={isFavoriteOnly}
            onFavoriteFilterToggle={handleFavoriteFilterToggle}
          />
        )}
      </div>

      <main className="min-w-0 flex-1 overflow-hidden">
        {activeNote ? (
          isEditing ? (
            <NoteEditor
              key={activeNote.id}
              note={activeNote}
              availableTags={tags}
              onSave={handleSaveNote}
              onSaveAndExit={handleSaveAndExit}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <NoteViewer note={activeNote} onEdit={() => setIsEditing(true)} />
          )
        ) : (
          <div className="flex h-full items-center justify-center bg-surface p-10 text-text-secondary">
            <div className="max-w-md border border-border bg-surface-elevated/75 p-8 text-center backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Sin nota activa</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">Elegí una nota o empezá una nueva.</h1>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Usá la búsqueda, tags, favoritos y espacios para encontrar contexto rápido sin romper el foco de escritura.
              </p>
              <button
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

      <FloatingActionButton
        aria-label="Crear nota"
        onClick={handleCreateNote}
      />
    </div>
  );
}
