import { useState } from "react";
import { useShareStore } from "../../stores/useShareStore";

interface ShareDialogProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({ noteId, isOpen, onClose }: ShareDialogProps) {
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const { createShareLink, isLoading } = useShareStore();

  if (!isOpen) return null;

  const handleCreate = async () => {
    const link = await createShareLink(noteId, hasExpiry && expiresAt ? expiresAt : null);
    setCreatedToken(link.token);
  };

  const handleCopy = () => {
    if (createdToken) {
      navigator.clipboard.writeText(`${window.location.origin}/share/${createdToken}`);
    }
  };

  const handleClose = () => {
    setCreatedToken(null);
    setHasExpiry(false);
    setExpiresAt("");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="compartir nota"
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-elevated p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Compartir nota</h2>

        {!createdToken ? (
          <>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  aria-label="fecha de expiración"
                  checked={hasExpiry}
                  onChange={(e) => setHasExpiry(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-surface text-accent focus:ring-accent"
                />
                Fecha de expiración
              </label>

              {hasExpiry && (
                <div className="space-y-1">
                  <label htmlFor="expiry-date" className="block text-xs text-text-secondary">Expira el</label>
                  <input
                    id="expiry-date"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    aria-label="Expira el"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                Crear enlace
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary mb-2">Enlace creado:</p>
            <code className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary break-all">
              {`${window.location.origin}/share/${createdToken}`}
            </code>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleCopy}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
              >
                Copiar enlace
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
