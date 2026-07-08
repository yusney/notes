import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "../components/notes/SearchBar";
import { NoteList } from "../components/notes/NoteList";
import { MobilePageFrame } from "../components/layout/MobilePageFrame";
import { useNoteStore } from "../stores/useNoteStore";
import type { Note } from "../types";

const SEARCH_PAGE_SIZE = 10;

/**
 * MobileSearchPage — full-screen search route for `/search` on mobile
 * (decision #2: NOT a modal sheet).
 *
 * Behavior:
 *   - Local-only query state — typing here does NOT mutate the global
 *     `useNoteStore.searchQuery`. The desktop list filter lives in the
 *     global store; mobile search is a parallel concern. Keeping
 *     them decoupled means typing in mobile search doesn't reset the
 *     user's desktop-side query.
 *   - Filters the store's `notes` list by case-insensitive substring
 *     match against title OR content (content stripped of HTML tags).
 *   - Pagination: only the first `SEARCH_PAGE_SIZE` notes are rendered
 *     by default. When the user scrolls to the bottom (NoteList's
 *     InfiniteScrollSentinel fires `onLoadMore`), the next page is
 *     revealed. This applies to BOTH states (empty query → first 10
 *     of all notes; non-empty query → first 10 matches), so even when
 *     the user types a broad query like "a", the list stays tidy
 *     until they scroll for more.
 *   - When no notes match, shows an inline empty hint.
 *   - Tapping a note navigates to `/notes/:id`.
 */
export function MobileSearchPage() {
  const { notes } = useNoteStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(SEARCH_PAGE_SIZE);

  const filtered = useMemo<Note[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const title = n.title.toLowerCase();
      const content = n.content.replace(/<[^>]*>/g, " ").toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }, [notes, query]);

  // Reset the visible-page cursor whenever the query changes so each
  // new search starts from the first page.
  useEffect(() => {
    setVisibleCount(SEARCH_PAGE_SIZE);
  }, [query]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visible.length < filtered.length;

  return (
    <MobilePageFrame testId="mobile-search-page" className="flex flex-1 flex-col">
      <SearchBar onSearch={(q) => setQuery(q)} debounceMs={0} />
      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center text-text-secondary">
          <p className="text-sm">Sin resultados para &quot;{query}&quot;.</p>
          <p className="mt-1 text-xs">
            Probá con otra palabra o creá una nota nueva desde la pestaña Nueva.
          </p>
        </div>
      ) : (
        <NoteList
          notes={visible}
          activeNoteId={null}
          onNoteSelect={(id) => navigate(`/notes/${id}`)}
          onCreateNote={() => {
            // BottomNav's "Nueva" tab is the canonical create entry on
            // mobile. This handler exists so NoteList's "Crear una nota
            // nueva" empty-state link still works without throwing.
          }}
          infiniteScroll
          hasMore={hasMore}
          isLoadingMore={false}
          onLoadMore={() => setVisibleCount((c) => c + SEARCH_PAGE_SIZE)}
        />
      )}
    </MobilePageFrame>
  );
}
