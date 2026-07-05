/* eslint-disable react-doctor/no-noninteractive-element-interactions -- <dialog> is a native interactive element; onMouseDown on root closes on backdrop click */
import { useEffect, useReducer } from "react";
import { DayPicker } from "react-day-picker";
import { API_BASE_URL } from "../../api/client";
import { useShareStore } from "../../stores/useShareStore";

interface ShareDialogProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ShareState {
  hasExpiry: boolean;
  selectedDay: Date | undefined;
  hour: number;
  minute: number;
  createdToken: string | null;
}

type ShareAction =
  | { type: "set-expiry"; value: boolean }
  | { type: "set-day"; value: Date | undefined }
  | { type: "set-hour"; value: number }
  | { type: "set-minute"; value: number }
  | { type: "set-token"; value: string }
  | { type: "reset" };

const INITIAL_STATE: ShareState = {
  hasExpiry: false,
  selectedDay: undefined,
  hour: 23,
  minute: 59,
  createdToken: null,
};

function shareReducer(state: ShareState, action: ShareAction): ShareState {
  switch (action.type) {
    case "set-expiry": return { ...state, hasExpiry: action.value };
    case "set-day": return { ...state, selectedDay: action.value };
    case "set-hour": return { ...state, hour: action.value };
    case "set-minute": return { ...state, minute: action.value };
    case "set-token": return { ...state, createdToken: action.value };
    case "reset": return INITIAL_STATE;
  }
}

export function ShareDialog({ noteId, isOpen, onClose }: ShareDialogProps) {
  const [state, dispatch] = useReducer(shareReducer, INITIAL_STATE);
  const { hasExpiry, selectedDay, hour, minute, createdToken } = state;
  const { createShareLink, isLoading } = useShareStore();

  // REQ-PERF-05 — lazy CSS: keep react-day-picker/style.css out of the
  // cold-boot render-blocking chain. Load it on first dialog open.
  // Brief FOUC on first paint of the calendar widget (~1 frame) is
  // accepted in exchange for ~10 KB off the cold-boot payload.
  useEffect(() => {
    if (isOpen) void import("react-day-picker/style.css");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    let expiresAt: string | null = null;
    if (hasExpiry && selectedDay) {
      const d = new Date(selectedDay);
      d.setHours(hour, minute, 0, 0);
      expiresAt = d.toISOString();
    }
    const link = await createShareLink(noteId, expiresAt);
    dispatch({ type: "set-token", value: link.token });
  };

  const handleCopy = () => {
    if (createdToken) {
      navigator.clipboard.writeText(`${API_BASE_URL}/s/${createdToken}`);
    }
  };

  const handleClose = () => {
    dispatch({ type: "reset" });
    onClose();
  };

  const today = new Date();

  return (
    <dialog
      open
      aria-modal="true"
      aria-label="compartir nota"
      className="fixed inset-0 z-50 flex items-center justify-center border-0 bg-transparent p-0 m-0 w-full h-full max-w-none max-h-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm pointer-events-none" />
      <div
        className="relative w-full max-w-sm border border-border bg-surface-elevated p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">Compartir nota</h2>

        {!createdToken ? (
          <>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                {/* eslint-disable-next-line react-doctor/control-has-associated-label -- label is implicit: input is inside <label> */}
                <input
                  type="checkbox"
                  checked={hasExpiry}
                  onChange={(e) => dispatch({ type: "set-expiry", value: e.target.checked })}
                  className="size-4"
                />
                Fecha de expiración
              </label>

              {hasExpiry && (
                <div className="space-y-3">
                  {/* Custom day picker */}
                  <div className="rdp-custom rounded border border-border bg-surface p-2">
                    <DayPicker
                      mode="single"
                      selected={selectedDay}
                      onSelect={(day) => dispatch({ type: "set-day", value: day })}
                      disabled={{ before: today }}
                      startMonth={today}
                    />
                  </div>

                  {/* Hour / minute spinners — no native date input */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary">Hora:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "set-hour", value: hour === 0 ? 23 : hour - 1 })}
                        className="size-7 border border-border bg-surface text-text-primary hover:bg-surface-elevated text-sm"
                      >−</button>
                      <span className="w-8 text-center text-sm font-mono text-text-primary">
                        {String(hour).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "set-hour", value: hour === 23 ? 0 : hour + 1 })}
                        className="size-7 border border-border bg-surface text-text-primary hover:bg-surface-elevated text-sm"
                      >+</button>
                    </div>
                    <span className="text-text-secondary font-mono">:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "set-minute", value: minute === 0 ? 59 : minute - 1 })}
                        className="size-7 border border-border bg-surface text-text-primary hover:bg-surface-elevated text-sm"
                      >−</button>
                      <span className="w-8 text-center text-sm font-mono text-text-primary">
                        {String(minute).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "set-minute", value: minute === 59 ? 0 : minute + 1 })}
                        className="size-7 border border-border bg-surface text-text-primary hover:bg-surface-elevated text-sm"
                      >+</button>
                    </div>
                  </div>

                  {selectedDay && (
                    <p className="text-xs text-text-secondary">
                      Expira: {selectedDay.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })} a las {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isLoading || (hasExpiry && !selectedDay)}
                className="bg-accent px-4 py-2 text-sm font-bold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                Crear enlace
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary mb-2">Enlace creado:</p>
            <code className="block w-full border border-border bg-surface px-3 py-2 text-xs text-text-primary break-all">
              {`${API_BASE_URL}/s/${createdToken}`}
            </code>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="bg-accent px-4 py-2 text-sm font-bold text-accent-text transition-colors hover:bg-accent-hover"
              >
                Copiar enlace
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
