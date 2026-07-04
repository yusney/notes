import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface SideSheetProps {
  /**
   * Whether the sheet is currently visible. Toggling drives the native
   * `<dialog>` showModal/close() lifecycle — Escape and the backdrop
   * both invoke `onClose`, which the caller uses to flip `open` back
   * to `false`.
   */
  open: boolean;
  /**
   * Called whenever the user dismisses the sheet (Escape, backdrop
   * click, or — when PR3 wires it — the "Salir" confirmation flow).
   * The host must treat this as the new `open = false` signal.
   */
  onClose: () => void;
  /**
   * Optional content rendered after the built-in nav list. PR1 leaves
   * this empty; future work (e.g. PR3) can append additional sections.
   */
  children?: ReactNode;
}

/**
 * SideSheet — left drawer for shell-redesign-v1.
 *
 * Implementation note: this sheet is built on the **native**
 * `<dialog>` element with `showModal()`. That gives us a built-in
 * focus trap, the ::backdrop pseudo-element, and Escape-to-cancel
 * behaviour at zero dependency cost (no Radix, no Headless UI). The
 * JSDOM test-setup file polyfills `showModal`/`close` so unit tests
 * run against the same code path as the browser.
 *
 * Mount: always-mounted; the caller gates visibility via the `open`
 * prop. PR2 `MobileShell` will mount it inside its `md:hidden`
 * subtree so the drawer only appears on mobile widths.
 *
 * Auto-managed entries (Perfil → /profile, Configuración → /settings,
 * Salir → disabled placeholder) are baked into the component. PR3
 * (T3.3 "SideSheet Salir subtree") will replace the disabled Salir
 * with a real confirmation flow wired to `useAuthStore.logout()`.
 *
 * Safe-area: `pl-[var(--safe-left)]` on the inner wrapper pushes the
 * content away from the left-side camera/notch on landscape devices.
 */
export function SideSheet({ open, onClose, children }: SideSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Mount/unmount the native <dialog> when `open` toggles.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open]);

  // Native <dialog> fires `cancel` on Escape. Forward to onClose so the
  // caller can sync its `open` state back to false.
  function handleCancel() {
    onClose();
  }

  // Backdrop-click handler. Native <dialog> click bubbles with
  // e.target === dialogRef when the user clicks the ::backdrop area
  // (anywhere outside the inner content). Clicks on inner elements
  // resolve e.target to them, so the handler naturally ignores them.
  function handleClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  // The dialog isn't rendered when `open=false`; the effect above
  // handles the showModal/close() lifecycle on re-entry. This avoids
  // duplicate dialogs (an unsourced React warning when showModal is
  // called on an already-open dialog).
  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      data-testid="side-sheet"
      aria-label="Menú lateral"
      onCancel={handleCancel}
      onClick={handleClick}
      className="m-0 ml-0 mr-auto mt-auto mb-auto h-full max-h-screen w-[min(85vw,320px)] border-r border-border bg-surface-elevated p-0 text-text-primary backdrop:bg-black/60"
    >
      <div
        data-testid="side-sheet-inner"
        className="flex h-full flex-col gap-2 overflow-y-auto py-4 pl-[var(--safe-left)] pr-2"
      >
        <h2 className="px-4 text-[length:var(--type-caption)] font-semibold uppercase tracking-[0.22em] text-text-secondary">
          Menú
        </h2>
        <nav aria-label="Acciones de cuenta">
          <ul className="mt-2 flex flex-col gap-1">
            <li>
              <Link
                to="/profile"
                className="flex min-h-11 items-center gap-3 px-4 text-[length:var(--type-body-sm)] text-text-primary transition-colors hover:bg-surface"
              >
                <span aria-hidden="true">👤</span> Perfil
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                className="flex min-h-11 items-center gap-3 px-4 text-[length:var(--type-body-sm)] text-text-primary transition-colors hover:bg-surface"
              >
                <span aria-hidden="true">⚙️</span> Configuración
              </Link>
            </li>
            <li>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Disponible en la próxima versión"
                className="flex w-full min-h-11 items-center gap-3 px-4 text-left text-[length:var(--type-body-sm)] text-text-secondary opacity-60 cursor-not-allowed"
              >
                <span aria-hidden="true">↩</span> Salir
              </button>
            </li>
          </ul>
        </nav>
        {children !== undefined && (
          <div data-testid="side-sheet-children" className="mt-4 flex-1">
            {children}
          </div>
        )}
      </div>
    </dialog>
  );
}
