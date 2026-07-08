import { Suspense, lazy, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { NoteEditor } from "../components/editor/NoteEditor";
import { EditorSkeleton } from "../components/editor/EditorSkeleton";
import { useNoteStore } from "../stores/useNoteStore";

// REQ-PERF-06 — NoteViewer is lazy-loaded on the mobile route too, so
// the TipTap viewer chunk (~50 KB raw / ~15 KB gzip on top of the
// editor chunk) only lands when the user actually opens a note on
// mobile. Same .then adapter pattern as MainLayout because the module
// exports the component as a named export.
const NoteViewer = lazy(() =>
  import("../components/editor/NoteViewer").then((m) => ({ default: m.NoteViewer }))
);

/**
 * MobileNotePage — wrapper for `/notes/:id` on mobile.
 *
 * Resolves the route param to a note from the store. If the note
 * isn't loaded yet (cold load, deep link, fresh tab), the page calls
 * `fetchNote(id)` on mount and shows a brief loader until the note
 * resolves. Errors surface as an inline message.
 *
 * Local UI state (`isEditing`) gates between two surfaces that mirror
 * the desktop split:
 *
 *   - `isEditing === false` → mount `<NoteViewer>` (read-only) with
 *     `Compartir` and `Editar` buttons. The button row in the viewer
 *     matches the desktop surface so the user gets the same affordances
 *     on a touch viewport.
 *   - `isEditing === true`  → mount `<NoteEditor variant="mobile">`
 *     with auto-save + the bottom formatting toolbar. Tapping the
 *     back chevron in the MobileShell AppBar (`navigate(-1)`) flushes
 *     any pending auto-save via the editor's `visibilitychange` /
 *     unmount handlers (REQ-EDIT-08).
 *
 * The transition is purely local state — the URL stays on
 * `/notes/:id` whether the user is viewing or editing. That keeps the
 * browser back button and the MobileShell AppBar back chevron's
 * semantics consistent (one step back = home), and avoids polluting
 * the history stack with `/notes/:id/edit` entries.
 *
 * History: an earlier design (`mobile-note-edit` on
 * `release/mobile-v1`) mounted `<NoteEditor variant="mobile">`
 * directly so the user landed in edit mode as soon as they tapped a
 * note. The user reverted that decision — they want the viewer's
 * share + edit affordances visible first, like on desktop.
 */
export function MobileNotePage() {
  const { id } = useParams<{ id: string }>();
  const { notes, fetchNote, updateNote } = useNoteStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Default surface is the read-only viewer (Compartir + Editar),
  // matching the desktop split-view UX. The user explicitly chose
  // view-first on mobile even for empty notes — the viewer's
  // centred empty-state layout (icon + CTA) covers the "spaces"
  // complaint without breaking the view→edit contract.
  const [isEditing, setIsEditing] = useState(false);

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

  // View surface — read-only TipTap with `Compartir` + `Editar`
  // buttons. The viewer's TipTap editor is `readOnly` (the component
  // forces it on viewports ≤767px regardless of the prop), so the
  // user can't accidentally type into it.
  if (!isEditing) {
    return (
      <Suspense fallback={<EditorSkeleton />}>
        <NoteViewer note={note} onEdit={() => setIsEditing(true)} />
      </Suspense>
    );
  }

  // Edit surface — mobile variant (no Cancelar/Guardar header,
  // bottom-mounted formatting toolbar, `pb-[env(safe-area-inset-bottom)]`
  // on the content area so the virtual keyboard never covers the last
  // line, auto-save flush on visibilitychange + unmount per REQ-EDIT-08).
  // `key={note.id}` resets the editor's local reducer + TipTap
  // instance when navigating between notes.
  return (
    <NoteEditor
      key={note.id}
      note={note}
      variant="mobile"
      onSave={async (data) => {
        if (!id) return;
        await updateNote(id, data);
      }}
      onCancel={() => setIsEditing(false)}
      onSaveAndExit={async (data) => {
        if (!id) return;
        await updateNote(id, data);
        setIsEditing(false);
      }}
    />
  );
}