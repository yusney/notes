import { useState } from "react";
import { Modal } from "./ui/Modal";

const MAX_TAB_NAME_LENGTH = 50;

interface CreateTabDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateTabDialog({ open, onClose, onCreate }: CreateTabDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // When the dialog opens, the native showModal() moves focus to the first
  // focusable control (the name input) — no autoFocus prop or effect needed.

  const validateAndSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    if (trimmed.length > MAX_TAB_NAME_LENGTH) {
      setError("El nombre no puede exceder los 50 caracteres.");
      return;
    }
    onCreate(trimmed);
    // Reset state for next open
    setName("");
    setError(null);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (error) setError(null);
  };

  const handleClose = () => {
    setName("");
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="¿Nombre del nuevo espacio?">
      <div className="flex flex-col gap-3">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") validateAndSubmit();
            }}
            placeholder="Ej: Trabajo, Personal, Proyectos"
            maxLength={MAX_TAB_NAME_LENGTH}
            className="w-full border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-accent"
            aria-label="Nombre del espacio"
          />
          {error && (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={validateAndSubmit}
            className="flex-1 bg-accent px-4 py-2 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
          >
            Creá
          </button>
        </div>
      </div>
    </Modal>
  );
}
