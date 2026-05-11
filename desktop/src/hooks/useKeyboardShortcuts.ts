import { useEffect } from "react";

export interface ShortcutActions {
  onCreateNote: () => void;
  onSave: () => void;
  onFocusSearch: () => void;
  onExport: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      // Guard: ignore when typing in input or textarea
      const target = event.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!event.ctrlKey) return;

      const key = event.key.toLowerCase();

      if (key === "n") {
        event.preventDefault();
        actions.onCreateNote();
        return;
      }
      if (key === "s") {
        event.preventDefault();
        actions.onSave();
        return;
      }
      if (key === "k") {
        event.preventDefault();
        actions.onFocusSearch();
        return;
      }
      if (key === "e" && event.shiftKey) {
        event.preventDefault();
        actions.onExport();
        return;
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [actions]);
}
