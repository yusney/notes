import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

/**
 * Dialog shown when the user clicks the window close button.
 * - "Minimize to tray" → hides the window, process keeps running.
 * - "Close completely" → calls exit_app Tauri command, process exits.
 */
export function CloseDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();

    const unlisten = appWindow.listen("close-requested-dialog", () => {
      setOpen(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const minimize = async () => {
    setOpen(false);
    await getCurrentWindow().hide();
  };

  const close = async () => {
    setOpen(false);
    await invoke("exit_app");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl p-6 w-80 flex flex-col gap-4">
        <h2 className="text-[var(--color-text-primary)] font-semibold text-base">
          ¿Qué querés hacer?
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm">
          La app puede seguir ejecutándose en segundo plano o cerrarse completamente.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={minimize}
            autoFocus
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-medium text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            Minimizar a la bandeja
          </button>
          <button
            onClick={close}
            className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:bg-[var(--color-bg-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-border)]"
          >
            Cerrar completamente
          </button>
        </div>
      </div>
    </div>
  );
}
