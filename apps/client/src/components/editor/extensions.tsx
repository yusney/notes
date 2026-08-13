/**
 * TipTap extension arrays for NoteEditor and NoteViewer.
 *
 * Extracted from NoteEditor.tsx and NoteViewer.tsx so the component
 * files only export React components (Vite/React Fast Refresh requires
 * this; see react-doctor/only-export-components).
 *
 * The arrays are also imported by `extensions-parity.test.ts` which
 * locks the bugfix #2227 invariant: the editor and viewer MUST share
 * the same core extensions so a future change to one cannot silently
 * re-introduce the "Sin contenido." markdown-not-parsed bug class
 * (the mobile viewer treated the markdown source as raw HTML and
 * leaked the ` ``` ` fence characters into the rendered output).
 *
 * REQ-GRMR-01: lazy grammar loading. The shared `lowlight` instance
 * starts with ZERO grammars registered; grammars are pulled into it
 * the first time a code block of that language is encountered (see
 * `grammarLoader.ts` → `discoverAndRegisterGrammars`). Sharing a
 * single lowlight across editor and viewer means a grammar loaded
 * by one is reused by the other (no duplicate fetch).
 */
import { ReactNodeViewRenderer, Extension } from "@tiptap/react";
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
import { createLazyLowlight } from "./grammarLoader";
import { CodeBlockCopyButton } from "./CodeBlockCopyButton";

/**
 * Lazy grammar registry — shared between editor and viewer so a
 * grammar loaded by one is reused by the other. Exported so the
 * editor's grammar-discovery handler (`discoverAndRegisterGrammars`)
 * can hook into the same instance. See REQ-GRMR-01.
 */
export const lowlight = createLazyLowlight();

/**
 * Viewer's code-block extension: wraps the lowlight-backed code block
 * with a "Copiar" button. Editor uses the plain CodeBlockLowlight
 * (no copy button) plus its own Tab-keyboard extension.
 */
const CodeBlockWithCopyExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockCopyButton);
  },
});

/**
 * Editor-only keyboard extension: handle Tab inside code blocks
 * (insert two spaces instead of moving focus out of the block).
 * The viewer's code block is read-only, so this lives editor-side.
 */
const CodeBlockTabExtension = Extension.create({
  name: "codeBlockTab",
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // `this` is the Editor instance (TipTap Extension contract).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const editor = (this as any).editor;
        if (editor?.isActive("codeBlock")) {
          return editor.chain().focus().insertContent("  ").run();
        }
        return false;
      },
    };
  },
});

/**
 * Editor's extension array — used by `<NoteEditor>`. Includes a
 * markdown-aware paste/copy transformer (`transformPastedText: true`)
 * so pasted markdown converts to rich text on input.
 */
export const editorExtensions = [
  StarterKit.configure({ codeBlock: false }),
  CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
  CodeBlockTabExtension,
  Link.configure({ autolink: true, openOnClick: false }),
  TaskList,
  TaskItem.configure({ nested: false }),
  Table.configure({ resizable: false }),
  TableRow,
  TableCell,
  TableHeader,
  Markdown.configure({ transformPastedText: true, transformCopiedText: false }),
];

/**
 * Viewer's extension array — used by `<NoteViewer>`. Uses the
 * code-block-with-copy variant and disables paste/copy transformation
 * (the viewer is read-only).
 */
export const viewerExtensions = [
  StarterKit.configure({ codeBlock: false }),
  CodeBlockWithCopyExtension.configure({ lowlight, defaultLanguage: null }),
  // PR3-hotfix (shell-redesign-v1): the Notes.Api stores note content
  // as MARKDOWN, not HTML. The viewer must parse the markdown so
  // fenced code blocks render as <pre> blocks (lowlight-highlighted),
  // headings render as <h1>/<h2>/etc., and inline code/backticks
  // render as <code>. transformPastedText/transformCopiedText are
  // off because the viewer is read-only — there's no paste/copy flow
  // to convert.
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
