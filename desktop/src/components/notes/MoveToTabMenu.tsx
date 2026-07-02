import { useRef, useEffect } from "react";
import { Modal } from "../ui/Modal";
import type { Tab } from "../../types";

interface MoveToTabMenuProps {
  open: boolean;
  onClose: () => void;
  /** Used in the dialog's accessible label (e.g. "Mover «My Note» a otro espacio"). */
  noteTitle: string;
  /** The note's current tabId — must be EXCLUDED from the option list. */
  currentTabId: string;
  /** All available tabs (caller filters out the current one in the render, but we double-check here). */
  tabs: Tab[];
  /** Called with the chosen tabId when the user selects an option. */
  onSelect: (tabId: string) => void;
}

/**
 * Accessible "Mover nota a..." dialog. Closes the explicit a11y criterion of
 * issue #9 that the @dnd-kit KeyboardSensor alone did not satisfy (the drag
 * pickup flow is not a discoverable, single-keystroke alternative).
 *
 * Built on the project's native-<dialog> Modal so we get focus trap, backdrop,
 * and Escape handling for free. Each tab option is a regular <button>; the
 * dialog role + the labelled title handle accessibility. Arrow keys, Home, and
 * End are wired for keyboard navigation between options on top of the
 * browser's default Tab cycling.
 *
 * The current tab is excluded (no-op move). When only one tab exists, an
 * empty-state message is shown instead of a degenerate 1-item menu.
 */
export function MoveToTabMenu({
  open,
  onClose,
  noteTitle,
  currentTabId,
  tabs,
  onSelect,
}: MoveToTabMenuProps) {
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  // We track which options are rendered so the keyboard handler can move focus
  // across them by index — refs are stable across renders, so we collect them
  // imperatively on every render rather than via React state.
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const options = tabs.filter((tab) => tab.id !== currentTabId);

  // When the dialog opens, move focus to the first option so the user can
  // immediately press Enter (or arrow down) — no extra Tab required. The native
  // <dialog> shows the focus trap, but does not pick WHICH element gets focus.
  useEffect(() => {
    if (!open) return;
    // Wait a microtask so the dialog has mounted its options before focusing.
    queueMicrotask(() => {
      firstOptionRef.current?.focus();
    });
  }, [open]);

  if (!open) return null;

  function focusOption(index: number) {
    const clamped = ((index % options.length) + options.length) % options.length;
    optionRefs.current[clamped]?.focus();
  }

  function handleListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLButtonElement;
    const currentIndex = optionRefs.current.findIndex((btn) => btn === target);
    if (currentIndex === -1) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusOption(currentIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusOption(currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusOption(0);
        break;
      case "End":
        event.preventDefault();
        focusOption(options.length - 1);
        break;
      default:
        break;
    }
  }

  function handleSelect(tabId: string) {
    onSelect(tabId);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mover a..."
      closeOnEscape
    >
      <p className="text-xs text-text-secondary">
        Elegí el espacio de destino para <strong className="text-text-primary">{noteTitle}</strong>.
      </p>

      {options.length === 0 ? (
        <p
          className="border border-dashed border-border bg-surface-elevated/50 px-4 py-3 text-sm text-text-secondary"
          data-testid="move-to-tab-empty"
        >
          No hay otros espacios para mover esta nota.
        </p>
      ) : (
        <div
          role="group"
          aria-label={`Mover nota a otro espacio: ${noteTitle}`}
          onKeyDown={handleListKeyDown}
          className="flex max-h-72 flex-col gap-1 overflow-y-auto"
        >
          {options.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                optionRefs.current[index] = el;
                if (index === 0) firstOptionRef.current = el;
              }}
              type="button"
              data-testid={`move-to-tab-option-${tab.id}`}
              onClick={() => handleSelect(tab.id)}
              className="border border-border bg-surface-elevated px-3 py-2 text-left text-sm text-text-primary transition-colors hover:border-accent hover:bg-surface focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}