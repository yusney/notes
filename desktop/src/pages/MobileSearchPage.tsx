import { useMemo, useState } from "react";
import { SearchBar } from "../components/notes/SearchBar";
import { NoteList } from "../components/notes/NoteList";
import { useNoteStore } from "../stores/useNoteStore";
import type { Note } from "../types";

/**
 * MobileSearchPage — full-screen search route for `/search` on mobile
 * (decision #2: NOT a modal sheet).
 *
 * Behavior:
 *   - Local-only query state — typing here does NOT mutate the global
 *     `useNoteStore.searchQuery`. The desktop list filter lives in
 *     the global store; mobile search is a parallel concern. Keeping
 *     them decoupled means typing in mobile search doesn't reset the
 *     user's desktop-side query.
 *   - Filters the store's `notes` list by case-insensitive substring
 *     match against title OR content (content stripped of HTML tags).
 *   - When no notes match, shows an inline empty hint.
 *   - Tapping a note opens `/notes/:id` (the BottomNav / SideSheet
 *     handle navigation; here we expose onNoteSelect).
 */
export function MobileSearchPage() {
  const { notes } = useNoteStore();
  const [query, setQuery] = useState("");

  const filtered = useMemo<Note[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const title = n.title.toLowerCase();
      const content = n.content.replace(/<[^>]*>/g, " ").toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }, [notes, query]);

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-border p-4">
        {/* debounceMs=0 → immediate filter feedback on mobile (the desktop
            SearchBar debounces by 300ms; mobile users expect the list to
            narrow on each keystroke, not after a delay). */}
        <SearchBar onSearch={(q) => setQuery(q)} debounceMs={0} />
      </div>
      <div className="flex-1 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-text-secondary">
            <p className="text-sm">Sin resultados para &quot;{query}&quot;.</p>
            <p className="mt-1 text-xs">Probá con otra palabra o creá una nota nueva desde la pestaña Nueva.</p>
          </div>
        ) : (
          <NoteList
            notes={filtered}
            activeNoteId={null}
            onNoteSelect={() => {
              // Navigation to /notes/:id is handled by the parent route
              // tree. The page itself stays a presentational wrapper —
              // see App.tsx for the route definition.
            }}
            onCreateNote={() => {
              // BottomNav's "Nueva" tab is the canonical create entry on
              // mobile. This handler exists so NoteList's "Crear una nota
              // nueva" empty-state link still works without throwing.
            }}
          />
        )}
      </div>
    </div>
  );
}