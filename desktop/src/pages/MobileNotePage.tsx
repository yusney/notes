import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { NoteViewer } from "../components/editor/NoteViewer";
import { useNoteStore } from "../stores/useNoteStore";

/**
 * MobileNotePage — wrapper for `/notes/:id` on mobile (PR2).
 *
 * Resolves the route param to a note from the store. If the note
 * isn't loaded yet (cold load, deep link, fresh tab), the page calls
 * `fetchNote(id)` on mount and shows a brief loader until the note
 * resolves. Errors surface as an inline message + back affordance.
 *
 * The wrapper is read-only on mobile — REQ-VIEW-01 — by passing
 * `readOnly` to NoteViewer, which also forces read-only on mobile
 * even if a future caller tries to opt in.
 *
 * Note: the MobileShell that wraps this page already renders the
 * back chevron + title in its AppBar (route-aware), so we do NOT
 * add a competing AppBar here.
 */
export function MobileNotePage() {
  const { id } = useParams<{ id: string }>();
  const { notes, fetchNote } = useNoteStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const note = id ? notes.find((n) => n.id === id) ?? null : null;

  useEffect(() => {
    if (!id) return;
    if (note) return; // already loaded
    let cancelled = false;
    setLoading(true);
    fetchNote(id)
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la nota");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // We deliberately don't put `note` in the deps: the goal is to
    // fetch exactly once per id. Re-renders with a freshly-loaded
    // note must not re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fetchNote]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-text-secondary">
        <p className="text-sm">No se pudo cargar la nota.</p>
        <p className="text-xs text-text-secondary/80">{error}</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-text-secondary">
        {loading ? (
          <>
            <div
              aria-hidden="true"
              className="size-10 animate-spin rounded-full border-2 border-border border-t-accent"
            />
            <p className="text-sm">Cargando nota…</p>
          </>
        ) : (
          <p className="text-sm">Nota no encontrada.</p>
        )}
      </div>
    );
  }

  return (
    <NoteViewer
      key={note.id}
      note={note}
      readOnly
      onEdit={() => {
        // No-op on mobile v1.0 — editing on mobile is out of scope
        // for PR2. The TipTap editor is desktop-only for now.
      }}
    />
  );
}