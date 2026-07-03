import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../stores/useAuthStore";

/**
 * MobileSettingsSheet (S5) — bottom-sheet for the mobile settings menu.
 *
 * On mobile, the user accesses settings via a hamburger in the chrome
 * (not part of this component's scope — wired by the caller). When the
 * sheet opens, it presents a 'Configuración' menu with a single
 * destructive entry 'Salir'. Tapping 'Salir' opens a confirmation step
 * ('¿Cerrar sesión?' / Confirmar / Cancelar). Confirming triggers
 * `useAuthStore.logout()` and calls `onClose`.
 *
 * Escape closes the sheet (native <dialog> 'cancel' event handler).
 *
 * The component is mounted always by the caller; visibility is
 * controlled by the `open` prop. When open=false, it renders nothing.
 *
 * Spec: design #2202 row 4 — "hamburger → bottom-sheet 'Configuración'
 * → 'Salir' with Spanish confirmation. Bottom-sheet avoids top-bar
 * clutter and is safe-area friendly."
 */

interface MobileSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSettingsSheet({ open, onClose }: MobileSettingsSheetProps) {
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
      // Reset the confirmation sub-step when the sheet fully closes.
      setConfirming(false);
    }
  }, [open]);

  // Native <dialog> fires `cancel` on Escape. Forward to onClose so the
  // caller can sync its `open` state.
  function handleCancel() {
    onClose();
  }

  async function handleConfirm() {
    await logout();
    setConfirming(false);
    onClose();
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      data-testid="mobile-settings-sheet"
      onCancel={handleCancel}
      className="m-0 ml-auto mr-auto mt-auto w-full max-w-md border border-border bg-surface-elevated p-0 text-text-primary backdrop:bg-black/60"
      style={{
        // Sit at the bottom edge on mobile, respecting the safe-area
        // inset. bottom + inset-block-end keep the sheet flush to the
        // bottom regardless of the gesture bar.
        bottom: "calc(env(safe-area-inset-bottom))",
      }}
    >
      <div className="p-5">
        {!confirming ? (
          <>
            <h2 className="text-base font-semibold text-text-primary">Configuración</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Opciones de la cuenta en este dispositivo.
            </p>
            <ul className="mt-4 space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="flex w-full items-center justify-between rounded border border-border bg-surface px-4 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                >
                  <span>Salir</span>
                  <span aria-hidden="true" className="text-base leading-none">→</span>
                </button>
              </li>
            </ul>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-text-primary">¿Cerrar sesión?</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Cerraremos tu sesión en este dispositivo. Vas a tener que volver a ingresar tu
              email y contraseña para entrar.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-elevated"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded border border-danger bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger-hover"
              >
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}