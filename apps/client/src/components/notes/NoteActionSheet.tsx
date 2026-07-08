import { Modal } from "../ui/Modal";

/**
 * One selectable action in the action sheet. The `kind` is the stable machine
 * identifier passed to `onAction`; `label` is the user-visible text; `icon` is
 * a small decorative glyph rendered on the leading edge. Strings (not JSX) for
 * `icon` keep the prop trivial to construct from `{ kind, label }` literals
 * upstream.
 */
export interface NoteAction {
  kind: string;
  label: string;
  icon?: string;
}

interface NoteActionSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * Note title displayed as the dialog subject (e.g. "Mi nota"). Used verbatim
   * — the dialog also accents this in the body copy when the user is about to
   * delete, mirroring `MainLayout.handleDeleteNote`.
   */
  noteTitle: string;
  /**
   * Action options rendered in the sheet. At minimum this change ships
   * `{ kind: "delete", label: "Eliminar" }` (REQ-LIST-03). The list is
   * caller-driven so the same component can grow future actions
   * ("Compartir", "Mover a…") without the sheet needing to know them.
   */
  actions: NoteAction[];
  /** Invoked with the chosen action's `kind`. */
  onAction: (kind: string) => void;
}

/**
 * NoteActionSheet — mobile long-press context menu.
 *
 * Built on the same native-`<dialog>` Modal as `MoveToTabMenu` so the focus
 * trap, backdrop click, and Escape handling come for free. The sheet is only
 * mounted while `open === true` (matches the Modal primitive's `if (!open)
 * return null` contract).
 *
 * Each action is a `min-h-11 min-w-11` button (44×44 touch target per the
 * shell-redesign-v1 PR1 mobile standard). Tapping fires `onAction(kind)` and
 * closes the sheet in a single click.
 */
export function NoteActionSheet({
  open,
  onClose,
  noteTitle,
  actions,
  onAction,
}: NoteActionSheetProps) {
  if (!open) return null;

  function handleAction(kind: string) {
    onAction(kind);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Acciones de la nota" closeOnEscape>
      <p className="text-xs text-text-secondary">
        Elegí una acción para <strong className="text-text-primary">{noteTitle}</strong>.
      </p>

      <div
        role="group"
        aria-label={`Acciones disponibles para ${noteTitle}`}
        className="flex flex-col gap-1"
      >
        {actions.map((action) => (
          <button
            key={action.kind}
            type="button"
            data-testid={`note-action-sheet-option-${action.kind}`}
            onClick={() => handleAction(action.kind)}
            className="flex min-h-11 min-w-11 items-center gap-3 border border-border bg-surface-elevated px-4 py-2 text-left text-sm text-text-primary transition-colors hover:border-accent hover:bg-surface focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            {action.icon && (
              <span aria-hidden="true" className="text-base leading-none">
                {action.icon}
              </span>
            )}
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
