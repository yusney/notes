import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/extension-bubble-menu";

export const SUPPORTED_LANGUAGES = [
  "bash",
  "c",
  "cpp",
  "css",
  "go",
  "html",
  "java",
  "javascript",
  "json",
  "kotlin",
  "markdown",
  "php",
  "python",
  "ruby",
  "rust",
  "sql",
  "typescript",
  "xml",
  "yaml",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

interface CodeBlockBubbleMenuProps {
  editor: Editor;
  onFormat: () => void;
}

export function CodeBlockBubbleMenu({ editor, onFormat }: CodeBlockBubbleMenuProps) {
  const currentLang = editor.getAttributes("codeBlock").language as string | null;

  function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    editor.chain().focus().setCodeBlock({ language: e.target.value }).run();
  }

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed }) => (ed as Editor).isActive("codeBlock")}
      tippyOptions={{ duration: 100 }}
    >
      <div className="flex items-center gap-1 rounded border border-border bg-surface-elevated px-2 py-1 shadow-md">
        <label htmlFor="code-language-select" className="sr-only">
          Language
        </label>
        <select
          id="code-language-select"
          aria-label="Language"
          value={currentLang ?? ""}
          onChange={handleLanguageChange}
          className="bg-transparent text-xs text-text-primary outline-none"
        >
          <option value="">Auto</option>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={onFormat}
          aria-label="Format code"
          className="text-xs font-semibold text-text-secondary hover:text-text-primary"
        >
          Format
        </button>
      </div>
    </BubbleMenu>
  );
}
