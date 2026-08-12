import { useRef } from "react";

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
 * The dialog is mounted only while `open` is true, so it is never visible
 * when closed — regardless of webview quirks around the native dialog
 * default display. On mount, `showModal()` activates the native focus trap
 * and backdrop; Escape is handled via the native `cancel` event (no document
 * listener, no useEffectEvent).
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  closeOnEscape = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Only mount the dialog while open — guarantees it is never shown when
  // closed, in any webview.
  if (!open) return null;

  function handleCancel(event: React.SyntheticEvent) {
    // Keep `open` as the source of truth: prevent the native close and let
    // the parent flip `open` to false, which unmounts the dialog.
    event.preventDefault();
    if (closeOnEscape) {
      onClose();
    }
  }

  return (
    <dialog
      ref={(el) => {
        dialogRef.current = el;
        // Activate as a modal on mount: native focus trap + backdrop.
        if (el && !el.open) {
          el.showModal();
        }
      }}
      onCancel={handleCancel}
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 m-auto max-w-full border border-border bg-surface-elevated rounded-xl shadow-2xl p-6 w-80 flex flex-col gap-4"
    >
      <h2 id="modal-title" className="text-text-primary font-semibold text-base">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
