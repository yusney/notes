import type { Editor } from "@tiptap/react";

/**
 * Mobile-optimised formatting toolbar for `NoteEditor` (REQ-EDIT-02 /
 * REQ-EDIT-03 / REQ-LAY-04 — mobile-note-edit).
 *
 * - Every button has a 44×44 px minimum touch target (Apple HIG / Material 3).
 * - Wrapped in `overflow-x-auto` so the row scrolls horizontally on
 *   extra-narrow viewports (≤360px) without truncating buttons.
 * - Sticky-bottom positioning is provided by the parent `NoteEditor`
 *   mobile variant via flex layout (the toolbar is a sibling of the
 *   scrollable content area at the bottom of the editor pane).
 * - Background uses `bg-surface-elevated/95 backdrop-blur` so content
 *   does not bleed through when the toolbar overlays the last line
 *   during a scroll.
 */
interface NoteEditorMobileToolbarProps {
  editor: Editor;
}

interface MobileButtonProps {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}

function MobileButton({ onClick, active, label, children }: MobileButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active ?? false}
      data-testid={`mobile-toolbar-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={[
        "flex shrink-0 items-center justify-center rounded px-2 text-sm font-bold",
        "min-h-11 min-w-11", // 44×44 px touch target (Apple HIG / Material 3)
        "transition-colors",
        active
          ? "bg-border text-text-primary"
          : "text-text-secondary hover:bg-surface hover:text-text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function NoteEditorMobileToolbar({ editor }: NoteEditorMobileToolbarProps) {
  function handleLinkClick() {
    // Mobile UX: native prompt is the simplest input affordance — the
    // soft keyboard already covers alternative inline inputs.
    const url = window.prompt("URL", "https://");
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div
      data-testid="editor-toolbar"
      role="toolbar"
      aria-label="Barra de formato móvil"
      className="flex flex-nowrap items-center gap-0.5 overflow-x-auto border-t border-border bg-surface-elevated/95 px-2 py-1 backdrop-blur"
    >
      <MobileButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        label="Título 1"
      >
        H1
      </MobileButton>
      <MobileButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        label="Título 2"
      >
        H2
      </MobileButton>
      <MobileButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        label="Título 3"
      >
        H3
      </MobileButton>

      <div className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />

      <MobileButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="Negrita"
      >
        <strong>B</strong>
      </MobileButton>
      <MobileButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="Cursiva"
      >
        <em>I</em>
      </MobileButton>

      <div className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />

      <MobileButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="Lista sin orden"
      >
        <span aria-hidden="true" className="text-[11px] leading-none">≡</span>
      </MobileButton>
      <MobileButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="Lista ordenada"
      >
        <span aria-hidden="true" className="text-[11px] leading-none">1.</span>
      </MobileButton>

      <div className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />

      <MobileButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
        label="Bloque de código"
      >
        <span aria-hidden="true" className="font-mono text-[10px] leading-none">{"<>"}</span>
      </MobileButton>

      <MobileButton onClick={handleLinkClick} active={editor.isActive("link")} label="Enlace">
        <span aria-hidden="true" className="text-[12px] leading-none">🔗</span>
      </MobileButton>
    </div>
  );
}
