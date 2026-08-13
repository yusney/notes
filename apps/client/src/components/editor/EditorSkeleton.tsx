/**
 * EditorSkeleton (REQ-PERF-06)
 *
 * Placeholder rendered inside MainLayout's editor pane while the lazy
 * NoteEditor / NoteViewer chunk is resolving. Mirrors the empty-state
 * container's outer div (`h-full` + `bg-surface`) so the CLS delta on
 * chunk resolve is zero — the inner content swaps from skeleton to
 * editor in the same frame.
 *
 * Mounted ONLY when a note is selected AND isEditing matches the
 * editor/viewer type (see MainLayout.tsx). The empty-state path does
 * NOT mount this skeleton — that saves the cost of the lazy chunk on
 * a cold-boot to `/` when the user may never open the editor.
 */
export function EditorSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full items-center justify-center bg-surface"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          aria-hidden="true"
          className="h-2 w-32 overflow-hidden rounded-full bg-border"
        >
          <div className="h-full w-2/3 animate-pulse rounded-full bg-accent/60" />
        </div>
        <span className="sr-only">Cargando editor…</span>
      </div>
    </div>
  );
}
