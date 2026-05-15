import { useState, useEffect } from "react";
import { EditorContent, useEditor, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import type { Note } from "../../types";
import type { NodeViewProps } from "@tiptap/react";

const lowlight = createLowlight(all);

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

interface NoteViewerProps {
  note: Note;
  onEdit: () => void;
}

export function NoteViewer({ note, onEdit }: NoteViewerProps) {
  const viewer = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockWithCopyExtension.configure({ lowlight, defaultLanguage: null }),
    ],
    content: note.content,
    editable: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    viewer?.commands.setContent(note.content, { emitUpdate: false });
  }, [note.content, viewer]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface-elevated px-6 py-4">
        <h1 className="min-w-0 truncate text-xl font-semibold text-text-primary">{note.title}</h1>
        <button
          type="button"
          onClick={onEdit}
          className="ml-4 shrink-0 bg-accent px-4 py-1.5 text-sm font-bold text-accent-text transition-colors hover:bg-accent-hover"
        >
          Editar
        </button>
      </div>

      <div className="note-viewer flex-1 overflow-x-hidden overflow-y-auto px-8 py-6">
        {note.content ? (
          <EditorContent editor={viewer} />
        ) : (
          <p className="text-sm text-text-secondary">Sin contenido.</p>
        )}
      </div>
    </div>
  );
}
