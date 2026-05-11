interface ShareWarningDialogProps {
  isOpen: boolean;
  activeShareCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ShareWarningDialog({
  isOpen,
  activeShareCount,
  onConfirm,
  onCancel,
}: ShareWarningDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-elevated p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-3">⚠️ Atención</h2>
        <p className="text-sm text-text-secondary mb-5">
          Esta nota tiene <strong className="text-text-primary">{activeShareCount}</strong> enlaces activos.
          Al eliminar la nota, todos los enlaces activos dejarán de funcionar.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-danger-hover"
          >
            Eliminar de todas formas
          </button>
        </div>
      </div>
    </div>
  );
}
