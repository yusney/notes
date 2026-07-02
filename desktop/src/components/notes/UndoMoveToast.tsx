import { useEffect, useState } from "react";
import { useNoteStore } from "../../stores/useNoteStore";

/**
 * Toast surfaced after a successful move-note-between-tabs action.
 * Listens to `lastMove` on the note store, renders a Spanish "Nota movida
 * a {tabName}" with an undo action that re-issues the move with the
 * captured source tabId. Auto-dismisses after 5s.
 *
 * If the undo PUT fails (e.g. source tab was deleted concurrently → 404),
 * the toast stays visible and surfaces a context-specific error in Spanish
 * ("No se pudo deshacer el movimiento") with role="alert" so screen readers
 * also announce the failure. We do NOT cascade a fresh success toast.
 */
export function UndoMoveToast() {
  const lastMove = useNoteStore((s) => s.lastMove);
  const moveNoteToTab = useNoteStore((s) => s.moveNoteToTab);
  const clearUndo = useNoteStore((s) => s.clearUndo);
  const [undoError, setUndoError] = useState<string | null>(null);

  // Auto-dismiss the success toast after 5s.
  useEffect(() => {
    if (!lastMove) return;
    const timer = setTimeout(() => clearUndo(), 5000);
    return () => clearTimeout(timer);
  }, [lastMove, clearUndo]);

  // Auto-dismiss the undo-error feedback after 5s as well.
  useEffect(() => {
    if (!undoError) return;
    const timer = setTimeout(() => setUndoError(null), 5000);
    return () => clearTimeout(timer);
  }, [undoError]);

  // Hide both when there's nothing to show.
  if (!lastMove && !undoError) return null;

  const handleUndo = async () => {
    // Snapshot before clearUndo so the captured source tabId is not lost.
    const snapshot = lastMove;
    setUndoError(null);
    clearUndo();
    if (!snapshot) return;
    try {
      await moveNoteToTab(snapshot.noteId, snapshot.sourceTabId);
    } catch {
      // Store already set `error: "No se pudo mover la nota"` via the
      // existing error banner; here we add a toast-level, context-specific
      // message so the user understands the undo itself failed.
      setUndoError("No se pudo deshacer el movimiento");
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="undo-move-toast"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 border border-border bg-surface-elevated px-4 py-3 shadow-lg"
    >
      {lastMove && (
        <>
          <span className="text-sm text-text-primary">
            Nota movida a <strong>{lastMove.destTabName}</strong>
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            Deshacer
          </button>
        </>
      )}
      {undoError && (
        <span
          role="alert"
          aria-live="assertive"
          data-testid="undo-error-feedback"
          className="text-sm text-danger"
        >
          {undoError}
        </span>
      )}
    </div>
  );
}
