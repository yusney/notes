import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNoteStore } from "../stores/useNoteStore";

/**
 * NewNotePage — PR2 stub for the `/new` mobile route.
 *
 * Satisfies the locked decision #3 (`/new` is redirect-only on
 * mobile v1.0 — NO TipTap editor). On mount:
 *   1. Call `createNote({title:"Nueva nota", content:"", tabId: activeTabId ?? firstTab})`.
 *   2. Navigate to `/` with `replace: true` so the `/new` entry is
 *      purged from the history stack (Android system back button
 *      will not return to a stale `/new` view).
 *
 * While the create call is in flight we render a brief
 * "Creando nota…" flash so the user has feedback that the tap was
 * registered. If the create rejects (network error, 401, etc.) we
 * surface a friendly error AND still try to navigate back to `/`.
 */
export function NewNotePage() {
  const navigate = useNavigate();
  const { createNote, activeTabId, tabs } = useNoteStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function go() {
      try {
        let tabId = activeTabId ?? tabs[0]?.id ?? null;
        if (!tabId) {
          // No tabs at all — there is no valid place to create the note.
          // Bounce back home; the user will land in the empty state.
          navigate("/", { replace: true });
          return;
        }
        await createNote({ title: "Nueva nota", content: "", tabId });
        if (cancelled) return;
        navigate("/", { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error al crear la nota");
      }
    }
    void go();
    return () => {
      cancelled = true;
    };
  }, [createNote, activeTabId, tabs, navigate]);

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