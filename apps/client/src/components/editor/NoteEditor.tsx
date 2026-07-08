/* eslint-disable react-doctor/prefer-tag-over-role -- div[role=status] is correct ARIA live region; no native HTML equivalent */
import { useEffect, useReducer, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
// REQ-PERF-05 — lowlight CSS ships with the editor lazy chunk (was
// previously in the cold-boot render-blocking chain via index.css).
import "../../styles/lowlight.css";
import { discoverAndRegisterGrammars } from "./grammarLoader";
import { editorExtensions, lowlight } from "./extensions";
import { useAutoSave, type SaveStatus } from "../../hooks/useAutoSave";
import type { Note, Tag } from "../../types";
import { TagInput } from "../notes/TagInput";
import { CodeBlockBubbleMenu } from "./CodeBlockBubbleMenu";
import { formatCodeBlock } from "./CodeFormatter";
import type { SupportedFormatLang } from "./CodeFormatter";
import { countEditorStats } from "./countEditorStats";
import { NoteEditorMobileToolbar } from "./NoteEditorMobileToolbar";

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving" || status === "pending") {
    return <span className="text-xs font-medium text-text-secondary">Guardando…</span>;
  }
  if (status === "saved") {
    return <span className="text-xs font-medium text-accent">Guardado ✓</span>;
  }
  if (status === "error") {
    return <span className="text-xs font-medium text-danger">Error al guardar</span>;
  }
  return null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={[
        "flex size-7 items-center justify-center text-xs font-bold transition-colors",
        active
          ? "bg-border text-text-primary"
          : "text-text-secondary hover:bg-surface hover:text-text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

interface EditorToolbarProps {
  editor: ReturnType<typeof useEditor>;
}

function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div
      role="toolbar"
      aria-label="Barra de formato"
      className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5"
    >
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Título 1"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Título 2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Título 3"
      >
        H3
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Negrita"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Cursiva"
      >
        <em>I</em>
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Lista sin orden"
      >
        <span className="text-[10px] leading-none">≡</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Lista ordenada"
      >
        <span className="text-[10px] leading-none">1.</span>
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Cita"
      >
        <span className="text-base leading-none">"</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Código en línea"
      >
        <span className="font-mono text-[10px]">`</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
        title="Bloque de código"
      >
        <span className="font-mono text-[9px] leading-none">{"<>"}</span>
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        title="Deshacer (Ctrl+Z)"
      >
        <span className="font-mono text-[10px] leading-none">↩</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        title="Rehacer (Ctrl+Y)"
      >
        <span className="font-mono text-[10px] leading-none">↪</span>
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Línea horizontal"
      >
        <span className="text-[10px] leading-none">―</span>
      </ToolbarButton>
    </div>
  );
}

interface NoteEditorProps {
  note: Note;
  availableTags?: Tag[];
  onSave: (data: { title: string; content: string; tagNames?: string[] }) => Promise<void>;
  onSaveAndExit?: (data: { title: string; content: string; tagNames?: string[] }) => Promise<void>;
  onCancel?: () => void;
  /**
   * Presentation variant. Defaults to `"desktop"` (the original
   * behaviour, byte-identical to the pre-mobile-note-edit baseline so
   * all existing `MainLayout` callers are unaffected). The `"mobile"`
   * variant:
   *   - replaces the desktop `Cancelar` / `Guardar` row with a
   *     status-only header (auto-save handles persistence);
   *   - mounts `NoteEditorMobileToolbar` at the BOTTOM of the editor
   *     pane (sticky) with 44×44 px touch targets (REQ-EDIT-03);
   *   - applies `pb-[env(safe-area-inset-bottom)]` on the content
   *     area so the virtual keyboard never covers the last line
   *     (REQ-EDIT-05);
   *   - flushes any pending auto-save on
   *     `document.visibilitychange` → "hidden" and on unmount
   *     (REQ-EDIT-08).
   */
  variant?: "desktop" | "mobile";
}

const EMPTY_TAGS: Tag[] = [];

type EditorState = { title: string; editorContent: string; tagNames: string[] };
type EditorAction =
  | { type: "set-title"; value: string }
  | { type: "set-content"; value: string }
  | { type: "set-tags"; names: string[] }
  | { type: "sync-note"; note: Note };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "set-title": return { ...state, title: action.value };
    case "set-content": return { ...state, editorContent: action.value };
    case "set-tags": return { ...state, tagNames: action.names };
    case "sync-note": return {
      title: action.note.title,
      editorContent: action.note.content,
      tagNames: (action.note.tags ?? []).map((t) => t.name),
    };
  }
}

export function NoteEditor({ note, availableTags = EMPTY_TAGS, onSave, onSaveAndExit, onCancel, variant = "desktop" }: NoteEditorProps) {
  const isMobile = variant === "mobile";
  const [{ title, editorContent, tagNames }, dispatch] = useReducer(editorReducer, {
    title: note.title,
    editorContent: note.content,
    tagNames: (note.tags ?? []).map((t) => t.name),
  });
  const setTitle = (v: string) => dispatch({ type: "set-title", value: v });
  const setEditorContent = (v: string) => dispatch({ type: "set-content", value: v });
  const setTagNames = (names: string[]) => dispatch({ type: "set-tags", names });
  const isSavingManually = useRef(false);
  const previousNoteId = useRef(note.id);
  // Tracks the last `note.content` we synced to the editor. The
  // sync useEffect below re-syncs when this ref's value differs from
  // the current `note.content` AND the editor's current HTML doesn't
  // match the new content. The second guard is what protects the
  // user-typing flow: after a debounce fires, the store updates with
  // the same HTML the editor already holds, so the re-sync is a no-op
  // and the cursor is preserved.
  const lastSyncedContentRef = useRef(note.content);
  // TipTap fires `onUpdate` once during the editor's initial
  // render (the ProseMirror view processes the `content` option and
  // emits a "transaction" event). Without this guard, that initial
  // `onUpdate` would set `editorContent` to the editor's initial
  // HTML (e.g. "<p></p>" for an empty note), arm the debounce, and
  // 1500ms later the auto-save would PUT the empty content — wiping
  // the real content the list endpoint just stripped. By skipping
  // the first `onUpdate` we let the editor's initial state settle
  // without triggering a round-trip.
  const isFirstEditorUpdate = useRef(true);

  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    extensions: editorExtensions,
    content: note.content,
    onUpdate: ({ editor }) => {
      if (isFirstEditorUpdate.current) {
        isFirstEditorUpdate.current = false;
        return;
      }
      setEditorContent(editor.getHTML());
    },
    editorProps: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return false;
        // Always parse paste content as markdown, even when the clipboard carries HTML.
        // We extract the plain text and feed it through tiptap-markdown's parser directly.
        event.preventDefault();
        const currentEditor = editorRef.current;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mdStorage = (currentEditor?.storage as any)?.markdown;
        if (mdStorage?.parser) {
          // Parse the plain text as markdown → HTML, then insert as HTML content.
          // This ensures headings, tables, bold etc. always render correctly
          // even when the clipboard also carries HTML from a web page.
          const parsed: string = mdStorage.parser.parse(text);
          currentEditor!.commands.insertContent(parsed, {
            parseOptions: { preserveWhitespace: true },
          });
        } else {
          view.dispatch(
            view.state.tr.insertText(text, view.state.selection.from, view.state.selection.to)
          );
        }
        return true;
      },
    },
  });

  // Keep ref in sync with editor instance
  (editorRef as React.MutableRefObject<typeof editor>).current = editor;

  // Derived — always reflects current editor text without extra state
  const editorText = editor?.getText() ?? "";

  useEffect(() => {
    // Different note — always sync (handled by the `key={note.id}` on
    // the parent, but we keep the explicit guard as defence-in-depth).
    if (previousNoteId.current !== note.id) {
      previousNoteId.current = note.id;
      lastSyncedContentRef.current = note.content;
      dispatch({ type: "sync-note", note });
      editor?.commands.setContent(note.content, { emitUpdate: false });
      return;
    }
    // Same note — re-sync only if the content changed AND the
    // editor's current HTML doesn't already match. The second
    // condition protects the user-typing flow: after the debounce
    // fires, the store updates with the same HTML the editor holds,
    // so the re-sync is skipped (no cursor reset).
    if (
      lastSyncedContentRef.current !== note.content &&
      editor &&
      editor.getHTML() !== note.content
    ) {
      lastSyncedContentRef.current = note.content;
      dispatch({ type: "sync-note", note });
      editor.commands.setContent(note.content, { emitUpdate: false });
    }
  }, [editor, note]);

  // REQ-GRMR-01: lazy grammar discovery on every editor mount / update
  // — same hook as NoteViewer. Cheap no-op for editors that never hit a
  // fenced code block.
  useEffect(() => {
    if (!editor) return;
    discoverAndRegisterGrammars(editor, lowlight);
    if (typeof editor.on !== "function") return;
    const onUpdate = () => discoverAndRegisterGrammars(editor, lowlight);
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  /** Always read from the live editor when available — avoids stale React state on fast saves. */
  function getCurrentContent() {
    return editor ? editor.getHTML() : editorContent;
  }

  async function handleAutoSave(value: string) {
    if (isSavingManually.current) return;
    const sep = "||TITLE||";
    const idx = value.indexOf(sep);
    const autoTitle = idx !== -1 ? value.substring(0, idx) : title;
    const autoContent = getCurrentContent();
    // Don't auto-save the editor's initial empty state. The editor
    // initialises with `<p></p>` for an empty note, which differs
    // from the store's `note.content` (which is `""` from the
    // list-endpoint projection). Without this guard, the auto-save
    // would PUT the empty `<p></p>` and wipe the backend's real
    // content before fetchNote returns it.
    if (autoContent === "<p></p>" || autoContent === "" || autoContent === "<p><br class=\"ProseMirror-trailingBreak\"></p>") return;
    await onSave({ title: autoTitle, content: autoContent, tagNames });
  }

  function handleTagsChange(names: string[]) {
    setTagNames(names);

    if (isSavingManually.current) return;
    void onSave({ title, content: getCurrentContent(), tagNames: names });
  }

  // Combine title, content and tags for debounce tracking.
  // Tags are part of the note state; adding/removing a tag must persist even
  // when the user does not change the title or body afterwards.
  const autoSaveValue = `${title}||TITLE||${editorContent}||TAGS||${tagNames.join(",")}`;
  const { status, save } = useAutoSave({
    value: autoSaveValue,
    onSave: handleAutoSave,
    delay: 1500,
  });

  // REQ-EDIT-08 — mobile-only flush-on-unmount + visibility-change flush.
  // The hook's debounce timer can hold a pending save that the user
  // expects to land in the backend before the tab is closed or the
  // app is backgrounded. We listen for the document-level event and
  // call the hook's `save()` to cancel the timer + invoke onSave
  // immediately. The cleanup also calls `save()` so route changes
  // don't drop the pending debounce.
  useEffect(() => {
    if (!isMobile) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void save();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      // Flush any pending debounce before the component unmounts.
      // (Route change, tab close, parent re-mount, etc.)
      void save();
    };
  }, [isMobile, save]);

  async function handleFormatCodeBlock() {
    if (!editor) return;
    const lang = editor.getAttributes("codeBlock").language as string | null;
    const supportedLangs: SupportedFormatLang[] = [
      "javascript", "typescript", "json", "css", "html", "markdown",
    ];
    if (!lang || !supportedLangs.includes(lang as SupportedFormatLang)) return;

    // Find the codeBlock ancestor from the current selection
    const { $from } = editor.state.selection;
    let depth = $from.depth;
    while (depth > 0 && $from.node(depth).type.name !== "codeBlock") {
      depth--;
    }
    // Verify we actually landed on a codeBlock node (not the doc root)
    if ($from.node(depth).type.name !== "codeBlock") return;

    const start = $from.start(depth);
    const end = $from.end(depth);
    const codeBlockText = $from.node(depth).textContent;

    if (!codeBlockText.trim()) return;

    try {
      const formatted = await formatCodeBlock(codeBlockText, lang as SupportedFormatLang);
      // Replace only the text content inside the codeBlock node — do NOT recreate the node
      editor.chain()
        .focus()
        .command(({ tr }) => {
          tr.replaceWith(start, end, editor.schema.text(formatted));
          return true;
        })
        .run();
    } catch (err) {
      console.error("[CodeFormatter] formatting failed:", err);
    }
  }

  async function handleCopyContent() {
    const text = editor ? editor.getText() : editorText;
    await navigator.clipboard.writeText(text);
  }

  async function handleManualSave() {
    isSavingManually.current = true;
    try {
      const data = { title, content: getCurrentContent(), tagNames };
      if (onSaveAndExit) {
        await onSaveAndExit(data);
      } else {
        await onSave(data);
      }
    } finally {
      isSavingManually.current = false;
    }
  }

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-surface">
      {isMobile ? null : (
        <div className="shrink-0 flex items-center justify-between border-b border-border bg-surface-elevated/85 px-8 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-secondary">Editor</p>
            <SaveStatusIndicator status={status} />
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Cancelar edición"
                className="border border-border bg-surface-elevated px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={handleManualSave}
              aria-label="Guardar nota"
              className="bg-accent px-4 py-2 text-sm font-bold text-accent-text transition-colors hover:bg-accent-hover"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div
        className={
          isMobile
            ? "shrink-0 mx-auto w-full px-4 pt-3"
            : "shrink-0 mx-auto w-full max-w-4xl px-10 pt-8"
        }
      >
        <input
          type="text"
          aria-label="Título de la nota"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la nota"
          className="w-full border-none bg-transparent text-4xl font-semibold tracking-tight text-text-primary outline-none placeholder:text-text-secondary"
        />
      </div>

      <div
        className={
          isMobile
            ? "shrink-0 mx-auto w-full px-4 py-2"
            : "shrink-0 mx-auto w-full max-w-4xl px-10 py-4"
        }
      >
        <TagInput
          availableTags={availableTags}
          selectedTagNames={tagNames}
          onChange={handleTagsChange}
        />
      </div>

      <div
        className={
          isMobile
            ? "note-editor flex min-h-0 flex-1 flex-col overflow-hidden border-x-0 border-t border-b-0 border-border bg-surface-elevated"
            : "note-editor mx-auto w-full max-w-4xl min-h-0 flex-1 overflow-hidden border border-b-0 border-border bg-surface-elevated flex flex-col"
        }
      >
        {!isMobile && <EditorToolbar editor={editor} />}
        {editor && (
          <CodeBlockBubbleMenu editor={editor} onFormat={handleFormatCodeBlock} />
        )}
        <div
          className={
            isMobile
              ? "note-editor-content flex-1 overflow-y-auto px-4 py-4 pb-[env(safe-area-inset-bottom)] text-text-primary [&_.ProseMirror]:min-h-[55vh] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:leading-7"
              : "note-editor-content flex-1 overflow-y-auto px-10 py-8 text-text-primary [&_.ProseMirror]:min-h-[55vh] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:leading-7"
          }
          data-placeholder-enabled={editorContent === "" ? "true" : undefined}
        >
          <EditorContent editor={editor} />
        </div>
        {isMobile && editor ? (
          <NoteEditorMobileToolbar editor={editor} />
        ) : (
          <EditorStatusBar text={editorText} onCopy={handleCopyContent} />
        )}
      </div>
    </div>
  );
}

interface EditorStatusBarProps {
  text: string;
  onCopy: () => void;
}

function EditorStatusBar({ text, onCopy }: EditorStatusBarProps) {
  const { chars, words, lines } = countEditorStats(text);
  return (
    <div
      role="status"
      aria-label="Estado del editor"
      className="flex items-center justify-between border-t border-border bg-surface px-4 py-1.5 text-xs text-text-secondary"
    >
      <span className="flex gap-4">
        <span aria-label="Caracteres">{chars} car.</span>
        <span aria-label="Palabras">{words} pal.</span>
        <span aria-label="Líneas">{lines} lín.</span>
      </span>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copiar contenido"
        title="Copiar contenido del editor"
        className="flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
      >
        <span>⧉</span>
        <span>Copiar</span>
      </button>
    </div>
  );
}
