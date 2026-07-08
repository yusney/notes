import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNoteStore } from "../stores/useNoteStore";
import { withTimeout, TimeoutError } from "../lib/withTimeout";

/**
 * NewNotePage — PR2 stub for the `/new` mobile route.
 *
 * Satisfies the locked decision #3 (`/new` is redirect-only on
 * mobile v1.0 — NO TipTap editor). On mount:
 *   1. Resolve `tabId` from `activeTabId`, the first tab, or by creating
 *      the default "General" tab for first-run accounts.
 *   2. Call `createNote({title:"Nueva nota", content:"", tabId})`.
 *   3. Navigate to `/notes/:id` with `replace: true` so the user sees
 *      the created note immediately and the `/new` entry is purged (Android system back button
 *      will not return to a stale `/new` view).
 *
 * While the create call is in flight we render a brief
 * "Creando nota…" flash so the user has feedback that the tap was
 * registered. If the create rejects (network error, 401, etc.) we
 * surface a friendly error with an explicit back-to-home action.
 */
export function NewNotePage() {
  const navigate = useNavigate();
  const { createNote, createTab, activeTabId, tabs } = useNoteStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function go() {
      try {
        let tabId = activeTabId ?? tabs[0]?.id ?? null;
        if (!tabId) {
          // Match MobileHomePage's first-run create flow: when there are
          // no spaces yet, create the default "General" space first so
          // BottomNav → Nueva works for a brand-new account too.
          const tab = await createTab("General");
          tabId = tab.id;
        }
        // 5s cutoff covers slow networks without leaving the UI in a
        // "Creando nota…" limbo on dead backends. Without this the page
        // hangs forever if the backend is down or the token is invalid.
        const note = await withTimeout(
          createNote({ title: "Nueva nota", content: "", tabId }),
          5000
        );
        if (cancelled) return;
        navigate(`/notes/${note.id}`, { replace: true });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof TimeoutError) {
          setError("La creación de la nota tardó demasiado. Probá de nuevo.");
        } else {
          setError(err instanceof Error ? err.message : "Error al crear la nota");
        }
      }
    }
    void go();
    return () => {
      cancelled = true;
    };
  }, [createNote, createTab, activeTabId, tabs, navigate]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-text-secondary">
        <p className="text-sm">No se pudo crear la nota.</p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-text-secondary">
      <div
        aria-hidden="true"
        className="size-10 animate-spin rounded-full border-2 border-border border-t-accent"
      />
      <p className="text-sm">Creando nota…</p>
    </div>
  );
}
