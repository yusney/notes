import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { useNoteStore } from "../../stores/useNoteStore";

interface ShareWarning {
  hasActiveShares: boolean;
  count: number;
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** The id of the note that will be deleted on confirm. */
  noteId: string;
  /** The title rendered in the dialog body and warning copy. */
  noteTitle: string;
}

/**
 * DeleteConfirmDialog — mobile destructive-action confirmation with the
 * share-warning gate (REQ-LIST-04, REQ-LIST-05).
 *
 * On open, calls `useNoteStore.getShareWarning(noteId)` so the dialog can
 * prepend the warning copy ("Esta nota tiene N enlace(s) compartido(s)…")
 * exactly like the wide-viewport `MainLayout.handleDeleteNote` flow. The dialog
 * stays mounted while the warning is being fetched; the Eliminar button is
 * disabled during that window to avoid double-fire (user can't tap a
 * half-loaded destructive control).
 *
 * On confirm, calls `useNoteStore.deleteNote(noteId)` and closes. On cancel
 * or Escape, closes WITHOUT calling delete. The Modal primitive handles
 * focus trap + Escape natively; this component adds the destructive-action
 * semantics + share-warning gate on top.
 */
export function DeleteConfirmDialog({
  open,
  onClose,
  noteId,
  noteTitle,
}: DeleteConfirmDialogProps) {
  const getShareWarning = useNoteStore((s) => s.getShareWarning);
  const deleteNote = useNoteStore((s) => s.deleteNote);

  const [warning, setWarning] = useState<ShareWarning | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch the share warning every time the dialog opens. We capture `open`
  // and `noteId` in deps so the fetch re-runs when the user opens the dialog
  // for a different note without the component fully unmounting.
  useEffect(() => {
    if (!open) {
      setWarning(null);
      setIsDeleting(false);
      return;
    }
    let cancelled = false;
    setWarning(null);
    // Fail-soft: if the share-warning endpoint is unavailable (offline,
    // 404, network error), we still let the user delete — surfacing the
    // error is the store's job (`useNoteStore.error` -> MainLayout banner).
    void getShareWarning(noteId)
      .then((result) => {
        if (!cancelled) setWarning(result);
      })
      .catch(() => {
        if (!cancelled) setWarning({ hasActiveShares: false, count: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [open, noteId, getShareWarning]);

  if (!open) return null;

  async function handleConfirm() {
    if (isDeleting || warning === null) return;
    setIsDeleting(true);
    try {
      await deleteNote(noteId);
      onClose();
    } catch {
      // Surface as a transient inline alert — the store-level error banner
      // (MainLayout) will also catch it on the next render.
      setIsDeleting(false);
    }
  }

  const shareCopy = warning && warning.hasActiveShares
    ? `Esta nota tiene ${warning.count} ${warning.count === 1 ? "enlace compartido" : "enlaces compartidos"}. Al eliminarla, los enlaces dejarán de funcionar.`
    : null;

  return (
    <Modal open={open} onClose={onClose} title="Eliminar nota" closeOnEscape>
      <p className="text-sm text-text-primary">
        ¿Eliminar <strong>«{noteTitle}»</strong>?
      </p>
      <p className="text-xs text-text-secondary">
        Esta acción no se puede deshacer.
      </p>

      {shareCopy && (
        <div
          data-testid="delete-confirm-share-warning"
          role="alert"
          className="border border-danger bg-danger/10 px-3 py-2 text-xs text-danger"
        >
          {shareCopy}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          data-testid="delete-confirm-cancel"
          className="min-h-11 min-w-11 rounded border border-border bg-surface-elevated px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            void handleConfirm();
          }}
          disabled={isDeleting || warning === null}
          data-testid="delete-confirm-confirm"
          className="min-h-11 min-w-11 rounded border border-danger bg-danger px-4 py-2 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}
