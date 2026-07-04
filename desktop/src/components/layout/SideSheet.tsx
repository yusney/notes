import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";

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
   * click, or the "Salir" confirmation flow).
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
 * Salir → confirmation sub-step) are baked into the component.
 *
 * PR3 wiring: Salir now opens a confirmation sub-step (¿Cerrar sesión? /
 * Cancelar / Cerrar sesión). Confirming calls `useAuthStore.logout()`
 * and `onClose`. Cancelling returns to the menu (the sheet stays open
 * so the user can navigate to Perfil or Configuración instead). This
 * subtree was extracted from the old `MobileSettingsSheet.tsx` (now
 * deleted) so the user has a single, consistent drawer for the
 * account menu.
 *
 * Safe-area: `pl-[var(--safe-left)]` on the inner wrapper pushes the
 * content away from the left-side camera/notch on landscape devices.
 */
export function SideSheet({ open, onClose, children }: SideSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const logout = useAuthStore((s) => s.logout);
  const [confirming, setConfirming] = useState(false);

  // Mount/unmount the native <dialog> when `open` toggles.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
    } else if (!open && dlg.open) {
      dlg.close();
      // Reset the confirmation sub-step when the sheet fully closes so
      // the next open lands on the menu (not stuck on "¿Cerrar sesión?").
      setConfirming(false);
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

  async function handleConfirmSalir() {
    await logout();
    setConfirming(false);
    onClose();
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
        {!confirming ? (
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
                  onClick={() => setConfirming(true)}
                  data-testid="side-sheet-salir"
                  className="flex w-full min-h-11 items-center gap-3 px-4 text-left text-[length:var(--type-body-sm)] text-text-primary transition-colors hover:bg-surface"
                >
                  <span aria-hidden="true">↩</span> Salir
                </button>
              </li>
            </ul>
          </nav>
        ) : (
          <div data-testid="side-sheet-salir-confirm" className="mt-2 px-4">
            <h3 className="text-[length:var(--type-body)] font-semibold text-text-primary">
              ¿Cerrar sesión?
            </h3>
            <p className="mt-1 text-[length:var(--type-body-sm)] text-text-secondary">
              Cerraremos tu sesión en este dispositivo. Vas a tener que volver a
              ingresar tu email y contraseña para entrar.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                data-testid="side-sheet-salir-cancel"
                className="flex-1 rounded border border-border bg-surface px-4 py-2 text-[length:var(--type-body-sm)] font-semibold text-text-primary transition-colors hover:bg-surface-elevated"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSalir}
                data-testid="side-sheet-salir-confirm-btn"
                className="flex-1 rounded border border-danger bg-danger px-4 py-2 text-[length:var(--type-body-sm)] font-semibold text-white transition-colors hover:bg-danger-hover"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
        {children !== undefined && (
          <div data-testid="side-sheet-children" className="mt-4 flex-1">
            {children}
          </div>
        )}
      </div>
    </dialog>
  );
}
