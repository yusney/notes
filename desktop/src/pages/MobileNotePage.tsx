import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { NoteEditor } from "../components/editor/NoteEditor";
import { useNoteStore } from "../stores/useNoteStore";

/**
 * MobileNotePage — wrapper for `/notes/:id` on mobile.
 *
 * Resolves the route param to a note from the store. If the note
 * isn't loaded yet (cold load, deep link, fresh tab), the page calls
 * `fetchNote(id)` on mount and shows a brief loader until the note
 * resolves. Errors surface as an inline message + back affordance.
 *
 * As of `mobile-note-edit` (release/mobile-v1), the page mounts
 * `<NoteEditor variant="mobile">` — the mobile editor is ALWAYS
 * editable (REQ-EDIT-01). The previous read-only `<NoteViewer>`
 * surface is gone from the mobile route. The TipTap editor handles
 * the same content shape (markdown) as the viewer, so the parity
 * invariant from bugfix #2227 is preserved (verified by
 * `extensions-parity.test.ts`).
 *
 * `onSave` calls `updateNote(id, { title, content, tagNames })` for
 * the auto-save debounce (1500ms) + on unmount / visibility-change
 * flush. `onSaveAndExit` is the explicit "navigate home" hook for
 * future UX (e.g. a back gesture that finalises and leaves) — the
 * current spec does not require it but the API is wired.
 *
 * Note: the MobileShell that wraps this page already renders the
 * back chevron + title in its AppBar (route-aware), so we do NOT
 * add a competing AppBar here.
 */
export function MobileNotePage() {
  const { id } = useParams<{ id: string }>();
  const { notes, fetchNote, updateNote } = useNoteStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const note = id ? notes.find((n) => n.id === id) ?? null : null;

  useEffect(() => {
    if (!id) return;
    // Only skip the fetch when we already have a note WITH content.
    // The list endpoint (`GET /api/notes`) returns notes without the
    // `content` field (server-side projection to keep the list payload
    // small) — so a note in the store may have `content: ""` even
    // though the note object exists. Guarding on `if (note) return;`
    // would skip the detail fetch in that case and leave the editor
    // empty (mobile-note-edit lifted the read-only fallback that
    // PR3-hotfix on shell-redesign-v1 originally protected against).
    if (note?.content) return;
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
    <NoteEditor
      key={note.id}
      note={note}
      variant="mobile"
      onSave={async (data) => {
        if (!id) return;
        await updateNote(id, data);
      }}
      onSaveAndExit={async (data) => {
        if (!id) return;
        await updateNote(id, data);
        navigate("/", { replace: true });
      }}
    />
  );
}