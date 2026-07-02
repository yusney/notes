import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Close when the user presses Escape. Default: true. */
  closeOnEscape?: boolean;
}

/**
 * Generic modal built on the native <dialog> element.
 *
 * - `showModal()`/`close()` provide a real focus trap and focus restore.
 * - Escape is handled via the native `cancel` event (no document listener,
 *   no useEffectEvent) — accessible by default.
 * - The `open` prop is the single source of truth; the effect only syncs the
 *   external DOM node, which is the canonical "synchronizing with external
 *   systems" use case endorsed by the React docs.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  closeOnEscape = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync the native dialog open state with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // The native `cancel` event fires when the user presses Escape on a modal
  // dialog. Prevent the default close so `open` stays the source of truth;
  // the effect above closes the dialog once the parent flips `open` to false.
  function handleCancel(event: React.SyntheticEvent) {
    event.preventDefault();
    if (closeOnEscape) {
      onClose();
    }
  }

  return (
    <>
      <style>{`dialog::backdrop { background: rgba(0, 0, 0, 0.6); }`}</style>
      <dialog
        ref={dialogRef}
        onCancel={handleCancel}
        aria-labelledby="modal-title"
        className="fixed inset-0 z-50 m-auto max-w-full border border-border bg-surface-elevated rounded-xl shadow-2xl p-6 w-80 flex flex-col gap-4"
      >
        <h2 id="modal-title" className="text-text-primary font-semibold text-base">
          {title}
        </h2>
        {children}
      </dialog>
    </>
  );
}
