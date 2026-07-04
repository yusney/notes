import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EditorContent, useEditor, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Link } from "@tiptap/extension-link";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Markdown } from "tiptap-markdown";
import { createLazyLowlight, discoverAndRegisterGrammars } from "./grammarLoader";
import type { Note } from "../../types";
import type { NodeViewProps } from "@tiptap/react";
import { ShareDialog } from "../share/ShareDialog";

/**
 * Mobile breakpoint (matches Tailwind `md:`). Exported so unit tests can
 * reuse the same constant if they need to compute viewports.
 */
export const MOBILE_MAX_PX = 767;

// REQ-GRMR-01: lazy grammar loading. The lowlight instance starts with
// ZERO grammars registered; grammars are pulled into the active
// instance the first time a code block of that language is encountered
// (see discoverAndRegisterGrammars in grammarLoader.ts).
const lowlight = createLazyLowlight();

function CodeBlockCopyButton({ node }: Pick<NodeViewProps, "node">) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (copied) return;
    await navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <NodeViewWrapper className="relative my-4">
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar código"
        className="absolute top-2 right-2 z-10 rounded border border-border bg-surface-elevated px-2 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        {copied ? "Copiado ✓" : "Copiar"}
      </button>
      <pre>
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}

const CodeBlockWithCopyExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockCopyButton);
  },
});

const viewerExtensions = [
  StarterKit.configure({ codeBlock: false }),
  CodeBlockWithCopyExtension.configure({ lowlight, defaultLanguage: null }),
  // PR3-hotfix (shell-redesign-v1): the Notes.Api stores note content
  // as MARKDOWN, not HTML. The viewer must parse the markdown so
  // fenced code blocks render as <pre> blocks (lowlight-highlighted),
  // headings render as <h1>/<h2>/etc., and inline code/backticks
  // render as <code>. Without this extension the viewer treated
  // `note.content` as raw HTML — markdown source (including the
  // ```` ``` ```` fence characters) leaked into the rendered output
  // as a single <p> of plain text. The editor (`NoteEditor`) has
  // always used this extension; the viewer was missing it (likely
  // because TipTap's default codeBlock handling works for HTML
  // content, and the original note content was HTML before the
  // backend migrated to markdown). transformPastedText/transform-
  // CopiedText are off because the viewer is read-only — there's
  // no paste/copy flow to convert.
  Markdown.configure({ transformPastedText: false, transformCopiedText: false }),
  Link.configure({
    openOnClick: true,
    HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
  }),
  TaskList,
  TaskItem.configure({ nested: false }),
  Table.configure({ resizable: false }),
  TableRow,
  TableCell,
  TableHeader,
];

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
  const navigate = useNavigate();
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
    <div className="flex h-full flex-col overflow-hidden bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface-elevated px-6 py-4">
        <div className="flex min-w-0 items-center gap-2">
          {/* Mobile-only back chevron — visible only at max-width:767px.
              Navigates explicitly to "/" (the home/list view). We can't
              use `navigate(-1)` because the history stack may contain
              routes like /login, /register, /share/:token from earlier
              sessions — the back button should always return to the note
              list, not whatever the user navigated through before. */}
          {isMobile && (
            <button
              type="button"
              data-testid="mobile-back-button"
              aria-label="Volver a la lista"
              onClick={() => navigate("/", { replace: true })}
              className="shrink-0 rounded p-1 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
            >
              <span aria-hidden="true" className="text-lg leading-none">←</span>
            </button>
          )}
          <h1 className="min-w-0 truncate text-xl font-semibold text-text-primary">{note.title}</h1>
        </div>
        <div className="ml-4 flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Compartir nota"
            className="border border-accent bg-accent-subtle px-4 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-text"
          >
            Compartir
          </button>
          {/* Desktop-only Edit button (REQ-VIEW-01 — mobile v1.0 is
              read-only). Conditionally rendered so it's gone from the
              DOM on mobile, not just visually hidden. Mirrors the
              conditional-render pattern of the back chevron above
              (which uses `{isMobile && (...)}`). The TipTap editor
              on the desktop side is mounted by the parent route, not
              by this button — see MainLayout's desktop branch. */}
          {!isMobile && (
            <button
              type="button"
              onClick={onEdit}
              className="bg-accent px-4 py-1.5 text-sm font-bold text-accent-text transition-colors hover:bg-accent-hover"
            >
              Editar
            </button>
          )}
        </div>
      </div>

      <ShareDialog noteId={note.id} isOpen={shareOpen} onClose={() => setShareOpen(false)} />

      <div className="note-viewer flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-8 py-6">
        {note.content ? (
          <EditorContent editor={viewer} />
        ) : (
          <p className="text-sm text-text-secondary">Sin contenido.</p>
        )}
      </div>
    </div>
  );
}
