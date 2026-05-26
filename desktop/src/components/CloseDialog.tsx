import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";

/**
 * Dialog shown when the user clicks the window close button.
 * - "Minimize to tray" → hides the window, process keeps running.
 * - "Close completely" → calls exit_app Tauri command, process exits.
 */
export function CloseDialog() {
  const [open, setOpen] = useState(false);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  // eslint-disable-next-line react-doctor/effect-needs-cleanup -- Tauri listen() is async; cleanup releases via unlistenRef.current?.()
  // eslint-disable-next-line react-doctor/exhaustive-deps -- empty deps intentional: runs once on mount; setOpen is a stable setState reference
  useEffect(() => {
    const appWindow = getCurrentWindow();
    let active = true;

    appWindow.listen("close-requested-dialog", () => setOpen(true))
      .then((fn) => { if (active) unlistenRef.current = fn; else fn(); });

    // react-doctor: cleanup releases the Tauri listener via ref
    return () => {
      active = false;
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, []);

  const minimize = async () => {
    setOpen(false);
    await invoke("hide_to_tray");
  };

  const close = async () => {
    setOpen(false);
    await invoke("exit_app");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-elevated border border-border rounded-xl shadow-2xl p-6 w-80 flex flex-col gap-4">
        <h2 className="text-text-primary font-semibold text-base">
          ¿Qué querés hacer?
        </h2>
        <p className="text-text-secondary text-sm">
          La app puede seguir ejecutándose en segundo plano o cerrarse completamente.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={minimize}
            className="w-full px-4 py-2 rounded-lg bg-accent text-accent-text font-medium text-sm hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Minimizar a la bandeja
          </button>
          <button
            type="button"
            onClick={close}
            className="w-full px-4 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-border"
          >
            Cerrar completamente
          </button>
        </div>
      </div>
    </div>
  );
}
