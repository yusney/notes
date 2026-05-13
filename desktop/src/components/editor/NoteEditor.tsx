import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import { useAutoSave, type SaveStatus } from "../../hooks/useAutoSave";
import type { Note, Tag } from "../../types";
import { TagInput } from "../notes/TagInput";
import { ShareDialog } from "../share/ShareDialog";
import { CodeBlockBubbleMenu } from "./CodeBlockBubbleMenu";
import { formatCodeBlock } from "./CodeFormatter";
import type { SupportedFormatLang } from "./CodeFormatter";

const lowlight = createLowlight(all);

const CodeBlockTabExtension = Extension.create({
  name: "codeBlockTab",
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive("codeBlock")) {
          this.editor.chain().focus().insertContent("  ").run();
          return true;
        }
        return false;
      },
    };
  },
});

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving" || status === "pending") {
    return <span className="text-xs font-medium text-text-secondary">Guardando...</span>;
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
        "flex h-7 w-7 items-center justify-center text-xs font-bold transition-colors",
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
}

export function NoteEditor({ note, availableTags = [], onSave, onSaveAndExit, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [editorContent, setEditorContent] = useState(note.content);
  const [tagNames, setTagNames] = useState<string[]>(
    (note.tags ?? []).map((t) => t.name)
  );
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const isSavingManually = useRef(false);
  const previousNoteId = useRef(note.id);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
      CodeBlockTabExtension,
    ],
    content: note.content,
    onUpdate: ({ editor }) => {
      setEditorContent(editor.getHTML());
    },
  });

  useEffect(() => {
    if (previousNoteId.current === note.id) return;
    previousNoteId.current = note.id;
    setTitle(note.title);
    setEditorContent(note.content);
    setTagNames((note.tags ?? []).map((t) => t.name));
    editor?.commands.setContent(note.content, { emitUpdate: false });
  }, [editor, note]);

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
  const { status } = useAutoSave({
    value: autoSaveValue,
    onSave: handleAutoSave,
    delay: 1500,
  });

  async function handleFormatCodeBlock() {
    if (!editor) return;
    const lang = editor.getAttributes("codeBlock").language as string | null;
    const supportedLangs: SupportedFormatLang[] = [
      "javascript", "typescript", "json", "css", "html", "markdown",
    ];
    if (!lang || !supportedLangs.includes(lang as SupportedFormatLang)) return;
    const raw = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      "\n"
    ) || editor.getText();
    try {
      const formatted = await formatCodeBlock(raw, lang as SupportedFormatLang);
      editor.chain().focus().selectAll().insertContent(formatted).run();
    } catch {
      // formatting failed silently — leave content unchanged
    }
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
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-elevated/85 px-8 py-4 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-secondary">Editor</p>
          <SaveStatusIndicator status={status} />
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              aria-label="Cancelar edición"
              className="border border-border bg-surface-elevated px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={() => setShareDialogOpen(true)}
            aria-label="Compartir nota"
            className="border border-accent bg-accent-subtle px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-text"
          >
            Compartir
          </button>
          <button
            onClick={handleManualSave}
            aria-label="Guardar nota"
            className="bg-accent px-4 py-2 text-sm font-bold text-accent-text transition-colors hover:bg-accent-hover"
          >
            Guardar
          </button>
        </div>
      </div>

      <ShareDialog
        noteId={note.id}
        isOpen={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
      />

      <div className="mx-auto w-full max-w-4xl px-10 pt-8">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la nota"
          className="w-full border-none bg-transparent text-4xl font-semibold tracking-tight text-text-primary outline-none placeholder:text-text-secondary"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl px-10 py-4">
        <TagInput
          availableTags={availableTags}
          selectedTagNames={tagNames}
          onChange={handleTagsChange}
        />
      </div>

      <div className="note-editor mx-auto w-full max-w-4xl flex-1 overflow-hidden border border-b-0 border-border bg-surface-elevated flex flex-col">
        <EditorToolbar editor={editor} />
        {editor && (
          <CodeBlockBubbleMenu editor={editor} onFormat={handleFormatCodeBlock} />
        )}
        <div className="note-editor-content flex-1 overflow-y-auto px-10 py-8 text-text-primary [&_.ProseMirror]:min-h-[55vh] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:leading-7">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
