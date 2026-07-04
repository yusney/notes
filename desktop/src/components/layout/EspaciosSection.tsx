import { useState } from "react";
import { useNoteStore } from "../../stores/useNoteStore";
import { CreateTabDialog } from "../CreateTabDialog";

/**
 * EspaciosSection — mobile drawer section listing the user's tabs
 * ("espacios") so they can switch the active tab from the SideSheet
 * without leaving the home view. Mounted inside MobileShell's
 * `md:hidden` subtree, so no extra mobile/desktop gate is needed
 * (REQ-LAY-03). Active-tab tokens are copied verbatim from the desktop
 * `Sidebar` (Sidebar.tsx:117) — no new Tailwind utilities, no
 * theme-token namespace conflicts. The "+" button opens the existing
 * `CreateTabDialog`; on success the new tab becomes active and the
 * drawer auto-closes. On `createTab` rejection the dialog stays open
 * (the error surfaces through `useNoteStore.error`).
 */
export interface EspaciosSectionProps {
  /**
   * Called when the user taps a tab row OR after a successful create.
   * `MobileShell` wires this to `closeSideSheet` so the drawer
   * dismisses and the home view re-renders with the new filter.
   */
  onClose: () => void;
}

export function EspaciosSection({ onClose }: EspaciosSectionProps) {
  const { tabs, activeTabId, notes, setActiveTab, createTab } = useNoteStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelectTab = (tabId: string) => {
    // Idempotent: tapping the active row skips the store call entirely
    // (REQ-TAB-04). The store also defends in depth.
    if (tabId !== activeTabId) {
      setActiveTab(tabId);
    }
    onClose();
  };

  const handleCreate = async (name: string) => {
    try {
      const newTab = await createTab(name);
      setActiveTab(newTab.id);
      setDialogOpen(false);
      onClose();
    } catch {
      // Leave the dialog open so the user can retry; the error
      // surfaces through useNoteStore.error.
    }
  };

  return (
    <div
      data-testid="espacios-section"
      className="flex flex-col border-b border-border"
    >
      <header className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-text-secondary">
          Espacios
        </span>
        <button
          type="button"
          data-testid="espacios-create-tab"
          onClick={() => setDialogOpen(true)}
          aria-label="Nueva tab"
          className="grid size-8 place-items-center rounded-full border border-border bg-surface text-lg leading-none text-accent transition-colors hover:border-accent hover:bg-accent hover:text-accent-text"
        >
          +
        </button>
      </header>

      {tabs.length === 0 ? (
        <div className="border-t border-dashed border-border px-4 py-4 text-sm text-text-secondary">
          No hay espacios. Creá uno para agrupar tus notas.
        </div>
      ) : (
        <nav aria-label="Espacios" className="max-h-72 overflow-y-auto pb-2">
          <ul className="flex flex-col">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const count = notes.filter((n) => n.tabId === tab.id).length;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    data-testid={`espacios-tab-${tab.id}`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex w-full min-h-11 items-center justify-between gap-2 px-4 py-3 text-left text-[length:var(--type-body-sm)] transition-colors ${
                      isActive
                        ? "bg-accent-subtle border-l-2 border-accent text-text-primary"
                        : "text-text-secondary hover:bg-surface hover:text-text-primary"
                    }`}
                  >
                    <span className="truncate">{tab.name}</span>
                    <span className="shrink-0 pl-2 text-xs text-text-secondary" data-testid={`espacios-tab-${tab.id}-count`}>
                      · {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <CreateTabDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}