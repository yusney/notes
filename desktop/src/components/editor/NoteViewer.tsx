import { useState, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
// REQ-PERF-05 — lowlight CSS ships with the viewer lazy chunk.
import "../../styles/lowlight.css";
import { discoverAndRegisterGrammars } from "./grammarLoader";
import { viewerExtensions, lowlight } from "./extensions";
import type { Note } from "../../types";
import { ShareDialog } from "../share/ShareDialog";

/**
 * Mobile breakpoint (matches Tailwind `md:`). Module-local — not
 * exported, because no test or other module needs to reuse it (the
 * previous export was dead code).
 */
const MOBILE_MAX_PX = 767;

interface NoteViewerProps {
  note: Note;
  onEdit: () => void;
  /**
   * Force the TipTap editor into read-only mode. Defaults to `true` to
   * preserve the original viewer behavior — the viewer is read-only by
   * design (mobile v1.0 is read-only per REQ-VIEW-01 / spec scope).
   *
   * On a touch viewport (max-width: 767px) we ALWAYS force read-only
   * regardless of this prop, because the v1.0 mobile UX is read-only.
   * Desktop callers can opt-in to editable if needed (currently no
   * caller does — the desktop editor uses the separate NoteEditor).
   */
  readOnly?: boolean;
}

/**
 * `useIsMobile` — minimal matchMedia hook returning `true` when the
 * viewport is at or below the mobile breakpoint. Re-renders on change.
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);
  return isMobile;
}

export function NoteViewer({ note, onEdit, readOnly = true }: NoteViewerProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const isMobile = useIsMobile();

  // Force read-only on mobile regardless of the prop — v1.0 mobile UX
  // is read-only per REQ-VIEW-01 and spec scope ("mobile editor deferred
  // to v1.1"). This is the strongest invariant for S7 (no editor
  // surface on the back-nav target).
  const effectiveReadOnly = readOnly || isMobile;

  const viewer = useEditor({
    extensions: viewerExtensions,
    content: note.content,
    editable: !effectiveReadOnly,
    immediatelyRender: false,
  });

  // Lazy grammar discovery — fires on every editor update so freshly
  // inserted code blocks register their grammar before TipTap's
  // renderer asks `lowlight.highlight(language, value)`. Also runs
  // once on initial mount (via the same effect on `viewer`).
  useEffect(() => {
    if (!viewer) return;
    discoverAndRegisterGrammars(viewer, lowlight);
    if (typeof viewer.on !== "function") return;
    const onUpdate = () => discoverAndRegisterGrammars(viewer, lowlight);
    viewer.on("update", onUpdate);
    return () => {
      viewer.off("update", onUpdate);
    };
  }, [viewer]);

  useEffect(() => {
    viewer?.commands.setContent(note.content, { emitUpdate: false });
  }, [note.content, viewer]);

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-surface">
      {/*
        Header layout — mobile and desktop diverge intentionally:
        - Mobile (<768px): stack the title and action buttons vertically
          and centre the whole block. The desktop split layout (title
          left, buttons right) wastes the middle of the bar on a narrow
          viewport, leaves Compartir / Editar as small right-aligned
          buttons, and forces the empty-state card below into a tall
          blank scroll area. The stacked centred version gives the bar
          visual weight and the buttons a touch-friendly width.
        - Desktop (≥768px): mirror the original split layout so the
          desktop split-view UX stays byte-identical with the previous
          surface (REQ-DESKTOP-01 / S9 visual-regression baseline).
      */}
      <div className="flex shrink-0 flex-col items-center gap-3 border-b border-border bg-surface-elevated px-4 py-4 md:flex-row md:justify-between md:gap-2 md:px-6 md:py-4">
        <h1 className="text-center text-lg font-semibold text-text-primary truncate md:text-left md:text-xl md:min-w-0 md:flex-1">
          {note.title}
        </h1>
        {/*
          Action row — mobile and desktop diverge:
          - Mobile (<768px): `w-full` so the row covers the full
            header width (minus the parent's `px-4`). The buttons
            share the row evenly via `flex-1`, so Compartir and Editar
            together span edge-to-edge of the header padding. No
            `max-w` cap — capping at `max-w-xs` (320px) left a visible
            whitespace gap on the right of wider phones, which the
            user reported as "no cubre todo el ancho de la pantalla".
          - Desktop (≥768px): `md:w-auto md:max-w-none md:justify-end`
            reverts to the natural-width row aligned to the right of
            the header (split layout per REQ-DESKTOP-01).
        */}
        <div className="flex w-full shrink-0 gap-2 md:w-auto md:max-w-none md:justify-end">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Compartir nota"
            className="flex-1 border border-accent bg-accent-subtle px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:flex-none md:px-4 md:py-1.5"
          >
            Compartir
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar nota"
            className="flex-1 bg-accent px-3 py-2 text-sm font-bold text-accent-text transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:flex-none md:px-4 md:py-1.5"
          >
            Editar
          </button>
        </div>
      </div>

      <ShareDialog noteId={note.id} isOpen={shareOpen} onClose={() => setShareOpen(false)} />

      <div className="note-viewer flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-8 py-6">
        {note.content ? (
          <EditorContent editor={viewer} />
        ) : (
          // Empty-state for a brand-new note or one whose content the
          // user has cleared. Wrapped in a dashed-border card so the
          // affordance has visual weight on a phone screen — a small
          // centred paragraph in a huge blank scroll area looked
          // broken (regression reported on mobile v1).
          //
          // Layout:
          //   - Outer flex column is `h-full` so the card can be
          //     vertically centred in the note-viewer scroll area.
          //   - The card itself uses `max-w-xs` so it never stretches
          //     edge-to-edge on a wider screen (desktop) and stays
          //     thumb-friendly on mobile.
          //   - The CTA reuses the same `onEdit` prop the header's
          //     `Editar` button calls, so the parent's transition
          //     logic (MainLayout's `setIsEditing(true)` /
          //     MobileNotePage's local `isEditing`) handles the swap.
          <div
            data-testid="viewer-empty-state"
            className="flex h-full flex-col items-center justify-center text-center"
          >
            {/*
              The card fills the content area width on mobile so it
              covers the full screen width minus the content area's
              `px-4` padding. On desktop it's capped via `md:max-w-xs`
              so the card stays a readable narrow strip in the right
              pane of the split-view layout (REQ-DESKTOP-01).
            */}
            <div className="flex w-full md:max-w-xs flex-col items-center gap-5 rounded-2xl border border-dashed border-border bg-surface-elevated/40 px-6 py-10">
              <div aria-hidden="true" className="text-6xl leading-none">
                📝
              </div>
              <div>
                <p className="text-base font-semibold text-text-primary">Esta nota está vacía</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Tocá el botón de abajo para empezar a escribir.
                </p>
              </div>
              <button
                type="button"
                onClick={onEdit}
                className="mt-1 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Empezar a escribir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
