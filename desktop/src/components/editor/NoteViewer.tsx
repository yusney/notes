import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import type { Note } from "../../types";

const lowlight = createLowlight(all);

interface NoteViewerProps {
  note: Note;
  onEdit: () => void;
}

export function NoteViewer({ note, onEdit }: NoteViewerProps) {
  const viewer = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
    ],
    content: note.content,
    editable: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    viewer?.commands.setContent(note.content, { emitUpdate: false });
  }, [note.content, viewer]);

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-6 py-4">
        <h1 className="truncate text-xl font-semibold text-text-primary">{note.title}</h1>
        <button
          type="button"
          onClick={onEdit}
          className="bg-accent px-4 py-1.5 text-sm font-bold text-accent-text transition-colors hover:bg-accent-hover"
        >
          Editar
        </button>
      </div>

      <div className="note-viewer flex-1 overflow-y-auto px-8 py-6">
        {note.content ? (
          <EditorContent editor={viewer} />
        ) : (
          <p className="text-sm text-text-secondary">Sin contenido.</p>
        )}
      </div>
    </div>
  );
}
