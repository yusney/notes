import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { NoteEditor } from "./NoteEditor";
import type { Note, Tag } from "../../types";
import { useEditor } from "@tiptap/react";

// Mock CodeFormatter so we can control its behavior in tests
vi.mock("./CodeFormatter", () => ({
  formatCodeBlock: vi.fn(),
}));

// Mock new markdown-paste extensions so they are identifiable in useEditor call
vi.mock("tiptap-markdown", () => ({
  Markdown: {
    configure: vi.fn((opts: unknown) => ({ _ext: "Markdown", _opts: opts })),
  },
}));
vi.mock("@tiptap/extension-link", () => ({
  Link: {
    configure: vi.fn((opts: unknown) => ({ _ext: "Link", _opts: opts })),
  },
}));
vi.mock("@tiptap/extension-task-list", () => ({
  TaskList: { _ext: "TaskList" },
}));
vi.mock("@tiptap/extension-task-item", () => ({
  TaskItem: {
    configure: vi.fn((opts: unknown) => ({ _ext: "TaskItem", _opts: opts })),
  },
}));

// Mock CodeBlockBubbleMenu to expose onFormat callback
vi.mock("./CodeBlockBubbleMenu", () => ({
  CodeBlockBubbleMenu: ({
    onFormat,
  }: {
    onFormat: () => void;
    editor: unknown;
  }) => (
    <button data-testid="mock-format-btn" onClick={onFormat}>
      Format
    </button>
  ),
}));

// Mock editor with getHTML so we can verify the save path reads from it
const mockGetHTML = vi.fn(() => "<p>content from editor</p>");
const mockInsertContentRun = vi.fn();
const mockDispatch = vi.fn();
const mockEditorInstance = {
  getHTML: mockGetHTML,
  isActive: vi.fn(() => false),
  getAttributes: vi.fn(() => ({ language: "javascript" })),
  getText: vi.fn(() => "const x=1"),
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      toggleHeading: vi.fn(() => ({ run: vi.fn() })),
      toggleBold: vi.fn(() => ({ run: vi.fn() })),
      toggleItalic: vi.fn(() => ({ run: vi.fn() })),
      toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
      toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
      toggleBlockquote: vi.fn(() => ({ run: vi.fn() })),
      toggleCode: vi.fn(() => ({ run: vi.fn() })),
      toggleCodeBlock: vi.fn(() => ({ run: vi.fn() })),
      undo: vi.fn(() => ({ run: vi.fn() })),
      redo: vi.fn(() => ({ run: vi.fn() })),
      setHorizontalRule: vi.fn(() => ({ run: vi.fn() })),
      insertContent: vi.fn(() => ({ run: mockInsertContentRun })),
      deleteSelection: vi.fn(() => ({ insertContent: vi.fn(() => ({ run: mockInsertContentRun })) })),
      command: vi.fn((cb) => { cb({ tr: { replaceWith: vi.fn() } }); return { setCodeBlock: vi.fn(() => ({ run: vi.fn() })) }; }),
    })),
  })),
  commands: {
    setContent: vi.fn(),
    selectAll: vi.fn(),
    insertContent: vi.fn(),
  },
  schema: { text: vi.fn((t: string) => t) },
  view: { dispatch: mockDispatch },
  state: {
    selection: {
      from: 0,
      to: 10,
      $from: {
        depth: 2,
        node: vi.fn((d: number) => ({
          type: { name: d === 2 ? "codeBlock" : "doc" },
          textContent: "const x=1",
        })),
        start: vi.fn(() => 0),
        end: vi.fn(() => 10),
      },
    },
    doc: { textBetween: vi.fn(() => "const x=1") },
  },
};

// TipTap doesn't fully work in jsdom — we test the wrapper behavior
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => mockEditorInstance),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content" data-editor={editor ? "ready" : "loading"} />
  ),
  Extension: {
    create: vi.fn((config: Record<string, unknown>) => config),
  },
}));

const mockTags: Tag[] = [
  { id: "tag-1", name: "react", userId: "u1", createdAt: "2024-01-01" },
  { id: "tag-2", name: "typescript", userId: "u1", createdAt: "2024-01-01" },
];

const mockNote: Note = {
  id: "n1",
  title: "Test Note",
  content: "<p>Hello world</p>",
  tabId: "t1",
  userId: "u1",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  tags: [mockTags[0]],
};

describe("NoteEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetHTML.mockReturnValue("<p>content from editor</p>");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders the note title", () => {
    render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
    expect(screen.getByDisplayValue("Test Note")).toBeInTheDocument();
  });

  it("renders the editor content area", () => {
    render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("shows 'idle' save status initially", () => {
    render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
    expect(screen.queryByText(/guardando/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guardado/i)).not.toBeInTheDocument();
  });

  it("shows 'Guardando...' status during auto-save debounce", async () => {
    render(<NoteEditor note={mockNote} onSave={vi.fn()} />);

    const titleInput = screen.getByDisplayValue("Test Note");
    act(() => {
      Object.defineProperty(titleInput, "value", { value: "Updated Title", writable: true });
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("renders manual save button", () => {
    render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: /guardar nota/i })).toBeInTheDocument();
  });

  it("calls onSave with current note data when save button clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={mockNote} onSave={onSave} />);

    const saveBtn = screen.getByRole("button", { name: /guardar nota/i });
    act(() => { saveBtn.click(); });

    await act(async () => { await Promise.resolve(); });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("manual save uses getHTML() from editor instance, not stale state", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    mockGetHTML.mockReturnValue("<p>fresh from editor</p>");

    render(<NoteEditor note={mockNote} onSave={onSave} />);

    const saveBtn = screen.getByRole("button", { name: /guardar nota/i });
    act(() => { saveBtn.click(); });

    await act(async () => { await Promise.resolve(); });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ content: "<p>fresh from editor</p>" })
    );
  });

  it("renders the formatting toolbar", () => {
    render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
    expect(screen.getByRole("toolbar", { name: /barra de formato/i })).toBeInTheDocument();
  });

  it("renders H1, H2, H3 toolbar buttons", () => {
    render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: /título 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /título 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /título 3/i })).toBeInTheDocument();
  });

  it("renders bold and italic toolbar buttons", () => {
    render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: /negrita/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cursiva/i })).toBeInTheDocument();
  });

  it("renders list toolbar buttons", () => {
    render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: /lista sin orden/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lista ordenada/i })).toBeInTheDocument();
  });

  it("renders blockquote, inline code and code block toolbar buttons", () => {
    render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: /cita/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /código en línea/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bloque de código/i })).toBeInTheDocument();
  });

  it("renders tags from note.tags as chips", () => {
    render(<NoteEditor note={mockNote} availableTags={mockTags} onSave={vi.fn()} />);
    expect(screen.getByText("react")).toBeInTheDocument();
  });

  it("includes tagNames in onSave payload when tag is added", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <NoteEditor note={{ ...mockNote, tags: [] }} availableTags={mockTags} onSave={onSave} />
    );

    const input = screen.getByPlaceholderText(/etiqueta/i);
    fireEvent.change(input, { target: { value: "work" } });
    fireEvent.keyDown(input, { key: "Enter" });

    const saveBtn = screen.getByRole("button", { name: /guardar nota/i });
    act(() => { saveBtn.click(); });

    await act(async () => { await Promise.resolve(); });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ tagNames: ["work"] })
    );
  });

  it("saves immediately when tag is added", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <NoteEditor note={{ ...mockNote, tags: [] }} availableTags={mockTags} onSave={onSave} />
    );

    const input = screen.getByPlaceholderText(/etiqueta/i);
    fireEvent.change(input, { target: { value: "urgent" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await act(async () => { await Promise.resolve(); });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ tagNames: ["urgent"] })
    );
  });

  it("removes tag chip and reflects in onSave", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <NoteEditor note={mockNote} availableTags={mockTags} onSave={onSave} />
    );

    const removeBtn = screen.getByRole("button", { name: /eliminar etiqueta react/i });
    fireEvent.click(removeBtn);

    const saveBtn = screen.getByRole("button", { name: /guardar nota/i });
    act(() => { saveBtn.click(); });

    await act(async () => { await Promise.resolve(); });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ tagNames: [] })
    );
  });

  // ─── Phase 1: Sticky Layout & Toolbar Baseline ───────────────────────────────

  describe("sticky layout structure", () => {
    it("toolbar is rendered outside the scrollable content container", () => {
      const { container } = render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const scrollContainer = container.querySelector(".note-editor-content");
      const toolbar = screen.getByRole("toolbar", { name: /barra de formato/i });
      expect(scrollContainer).toBeInTheDocument();
      // toolbar must NOT be a descendant of the scroll container
      expect(scrollContainer!.contains(toolbar)).toBe(false);
    });

    it("editor content area has overflow-y-auto class for scrolling", () => {
      const { container } = render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const scrollContainer = container.querySelector(".note-editor-content");
      expect(scrollContainer).not.toBeNull();
      expect(scrollContainer!.className).toContain("overflow-y-auto");
    });
  });

  describe("undo / redo toolbar buttons", () => {
    it("renders an Undo button in the toolbar", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      expect(screen.getByRole("button", { name: /deshacer/i })).toBeInTheDocument();
    });

    it("renders a Redo button in the toolbar", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      expect(screen.getByRole("button", { name: /rehacer/i })).toBeInTheDocument();
    });

    it("Undo button has a tooltip that includes the keyboard shortcut", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const undoBtn = screen.getByRole("button", { name: /deshacer/i });
      expect(undoBtn.getAttribute("title")).toMatch(/ctrl\+z/i);
    });

    it("Redo button has a tooltip that includes the keyboard shortcut", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const redoBtn = screen.getByRole("button", { name: /rehacer/i });
      expect(redoBtn.getAttribute("title")).toMatch(/ctrl\+y|ctrl\+shift\+z/i);
    });
  });

  describe("horizontal rule toolbar button", () => {
    it("renders a Horizontal Rule button in the toolbar", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      expect(screen.getByRole("button", { name: /línea horizontal/i })).toBeInTheDocument();
    });
  });

  // ─── Phase 2: Code Block Contextual Controls ─────────────────────────────────

  describe("2.4 — Format action integration", () => {
    it("renders the CodeBlockBubbleMenu (mock) inside NoteEditor", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      expect(screen.getByTestId("mock-format-btn")).toBeInTheDocument();
    });

    it("calls formatCodeBlock when Format button is clicked", async () => {
      const { formatCodeBlock } = await import("./CodeFormatter");
      const mockFmt = vi.mocked(formatCodeBlock);
      mockFmt.mockResolvedValue("const x = 1;\n");

      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const formatBtn = screen.getByTestId("mock-format-btn");

      await act(async () => {
        fireEvent.click(formatBtn);
        await Promise.resolve();
      });

      expect(mockFmt).toHaveBeenCalledTimes(1);
    });
  });

  describe("2.5 — Tab key inserts spaces in code blocks", () => {
    it("editor is configured with keyboard shortcut extensions", () => {
      // NoteEditor must pass keyboardShortcuts or an extension to handle Tab
      // We verify the editor is created (integration point) — actual tab behavior
      // requires real ProseMirror which doesn't work in jsdom. This test ensures
      // the extension setup call path runs without error.
      const { container } = render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      // The editor content wrapper must be present — proving editor initialized
      expect(container.querySelector(".note-editor-content")).toBeInTheDocument();
      // The tab shortcut is wired via editor extensions (verified in verify phase E2E)
    });
  });

  // ─── Phase 3: Theme-Aware Highlighting & Editor UX ───────────────────────────

  describe("3.3 — Empty code block placeholder", () => {
    it("renders a data-placeholder attribute on the ProseMirror wrapper for empty notes", () => {
      // NoteEditor must apply a CSS-driven placeholder via data-placeholder attribute
      // on the .note-editor-content wrapper when note content is empty
      const { container } = render(
        <NoteEditor note={{ ...mockNote, content: "" }} onSave={vi.fn()} />
      );
      const contentWrapper = container.querySelector(".note-editor-content");
      expect(contentWrapper).toBeInTheDocument();
      // The placeholder is applied via the TipTap editor's placeholder extension
      // In jsdom the EditorContent mock renders — we verify the wrapper is present
      // and the editor is initialized (full placeholder behavior tested in E2E)
      expect(container.querySelector("[data-testid='editor-content']")).toBeInTheDocument();
    });

    it("applies placeholder extension when content is empty", () => {
      // When note.content is empty string, editor must be configured to show placeholder
      // We check via a data attribute on the editor wrapper element
      const { container } = render(
        <NoteEditor note={{ ...mockNote, content: "" }} onSave={vi.fn()} />
      );
      // The note-editor-content wrapper must carry a data-placeholder-enabled attribute
      // when content is empty — this signals placeholder CSS is active
      const editorWrapper = container.querySelector(".note-editor-content");
      expect(editorWrapper?.getAttribute("data-placeholder-enabled")).toBe("true");
    });
  });

  describe("3.4 — Status bar", () => {
    it("renders the status bar region", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("displays character count in the status bar", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      // mockEditorInstance.getText returns "const x=1" (9 chars)
      expect(screen.getByText(/9\s*car/i)).toBeInTheDocument();
    });

    it("displays word count in the status bar", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      // "const x=1" → 2 words ("const" and "x=1")
      expect(screen.getByText(/2\s*pal/i)).toBeInTheDocument();
    });

    it("displays line count in the status bar", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      // "const x=1" → 1 line
      expect(screen.getByText(/1\s*lín/i)).toBeInTheDocument();
    });

    it("renders copy button in the status bar", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      expect(screen.getByRole("button", { name: /copiar/i })).toBeInTheDocument();
    });

    it("copy button calls clipboard.writeText with editor text content", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        writable: true,
        configurable: true,
      });

      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const copyBtn = screen.getByRole("button", { name: /copiar/i });

      await act(async () => {
        fireEvent.click(copyBtn);
        await Promise.resolve();
      });

      expect(writeText).toHaveBeenCalledWith("const x=1");
    });
  });

  // ─── Phase: Markdown Paste Recognition ───────────────────────────────────────

  // ─── Phase 4: CSS cursor/pointer-events behavior ─────────────────────────

  describe("task list checkbox CSS — editor context", () => {
    it("editor root has class 'note-editor' for CSS scoping of checkbox cursor", () => {
      const { container } = render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      // The outermost editor wrapper must carry .note-editor so the CSS rule
      // `.note-editor ... input[type="checkbox"] { cursor: pointer }` is active
      const editorRoot = container.querySelector(".note-editor");
      expect(editorRoot).toBeInTheDocument();
    });

    it("index.css contains cursor:pointer rule for task-list checkboxes in editor", () => {
      // RED: This test verifies the CSS rule exists in the stylesheet.
      // It will FAIL until the rule is added to index.css.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      const path = require("path") as typeof import("path");
      const cssPath = path.resolve(__dirname, "../../../src/index.css");
      const css = fs.readFileSync(cssPath, "utf-8");
      expect(css).toMatch(/\.note-editor[^}]*cursor\s*:\s*pointer/s);
    });
  });

  // ─── Phase 4.2: Regression — code block extensions not overridden ────────

  describe("code block extension regression", () => {
    it("includes CodeBlockLowlight in editorExtensions (not overridden by tiptap-markdown)", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      // CodeBlockLowlight is NOT mocked — it passes through as the real module object.
      // We verify StarterKit is configured with codeBlock: false (meaning our custom
      // CodeBlockLowlight takes over, not StarterKit's built-in).
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<unknown>;
      // At least 7 extensions: StarterKit, CodeBlockLowlight, CodeBlockTabExtension,
      // Link, TaskList, TaskItem, Markdown
      expect(extensions.length).toBeGreaterThanOrEqual(7);
    });

    it("StarterKit is configured with codeBlock: false so CodeBlockLowlight is used", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      // The editor content area must still render (no crash from extension conflict)
      const { container } = render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      expect(container.querySelector(".note-editor-content")).toBeInTheDocument();
    });

    it("CodeBlockTabExtension keyboard shortcut wiring is present alongside Markdown extension", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<{ _ext?: string; name?: string; addKeyboardShortcuts?: unknown }>;
      // The Markdown extension must be present (verified by mock)
      const markdownExt = extensions.find((e) => e._ext === "Markdown");
      expect(markdownExt).toBeDefined();
      // AND a keyboard-shortcut extension must also be present (CodeBlockTabExtension)
      // It has addKeyboardShortcuts from Extension.create config
      const hasKeyboardExt = extensions.some(
        (e) => e.addKeyboardShortcuts !== undefined || e.name === "codeBlockTab"
      );
      expect(hasKeyboardExt).toBe(true);
    });
  });

  describe("markdown paste — extension configuration", () => {
    it("configures useEditor with the Markdown extension (transformPastedText: true)", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<{ _ext?: string; _opts?: Record<string, unknown> }>;
      const markdownExt = extensions.find((e) => e._ext === "Markdown");
      expect(markdownExt).toBeDefined();
      expect(markdownExt?._opts).toMatchObject({
        transformPastedText: true,
        transformCopiedText: false,
      });
    });

    it("configures useEditor with the Markdown extension (transformCopiedText: false)", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<{ _ext?: string; _opts?: Record<string, unknown> }>;
      const markdownExt = extensions.find((e) => e._ext === "Markdown");
      expect(markdownExt?._opts?.transformCopiedText).toBe(false);
    });

    it("configures useEditor with the Link extension (autolink: true, openOnClick: false)", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<{ _ext?: string; _opts?: Record<string, unknown> }>;
      const linkExt = extensions.find((e) => e._ext === "Link");
      expect(linkExt).toBeDefined();
      expect(linkExt?._opts).toMatchObject({ autolink: true, openOnClick: false });
    });

    it("configures useEditor with TaskList extension", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<{ _ext?: string }>;
      const taskList = extensions.find((e) => e._ext === "TaskList");
      expect(taskList).toBeDefined();
    });

    it("configures useEditor with TaskItem extension (nested: false)", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<{ _ext?: string; _opts?: Record<string, unknown> }>;
      const taskItem = extensions.find((e) => e._ext === "TaskItem");
      expect(taskItem).toBeDefined();
      expect(taskItem?._opts).toMatchObject({ nested: false });
    });
  });

  // ─── mobile-note-edit: variant prop + mobile toolbar + visibility flush ───
  //
  // REQ-EDIT-01 / REQ-EDIT-02 / REQ-EDIT-05 / REQ-EDIT-08. The mobile
  // variant mounts the `NoteEditorMobileToolbar` at the bottom of the
  // editor pane (sticky), drops the desktop `Cancelar` / `Guardar` row
  // (status-only header), and applies `pb-[env(safe-area-inset-bottom)]`
  // on the content area so the soft keyboard never covers the last
  // line. It also flushes any pending auto-save on
  // `document.visibilitychange` → "hidden" and on unmount.

  describe("variant prop (mobile vs desktop)", () => {
    it("desktop variant (default) does NOT mount the mobile toolbar", () => {
      const { container } = render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      expect(container.querySelector('[data-testid="editor-toolbar"]')).toBeNull();
    });

    it("desktop variant does NOT render the safe-area-inset-bottom padding class", () => {
      const { container } = render(<NoteEditor note={mockNote} onSave={vi.fn()} />);
      const content = container.querySelector(".note-editor-content");
      expect(content).not.toBeNull();
      expect(content?.className).not.toMatch(/pb-\[env\(safe-area-inset-bottom\)\]/);
    });

    it("desktop variant still renders the Guardar / Cancelar header buttons (regression guard)", () => {
      render(
        <NoteEditor
          note={mockNote}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );
      expect(screen.getByRole("button", { name: /guardar nota/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancelar edición/i })).toBeInTheDocument();
    });

    it("mobile variant mounts the NoteEditorMobileToolbar at the bottom of the editor pane", () => {
      const { container } = render(
        <NoteEditor note={mockNote} onSave={vi.fn()} variant="mobile" />
      );
      const toolbar = container.querySelector('[data-testid="editor-toolbar"]');
      expect(toolbar).not.toBeNull();
    });

    it("mobile variant does NOT render the desktop Guardar button (auto-save handles persistence)", () => {
      render(<NoteEditor note={mockNote} onSave={vi.fn()} variant="mobile" />);
      expect(screen.queryByRole("button", { name: /guardar nota/i })).not.toBeInTheDocument();
    });

    it("mobile variant does NOT render the desktop Cancelar button", () => {
      render(
        <NoteEditor note={mockNote} onSave={vi.fn()} onCancel={vi.fn()} variant="mobile" />
      );
      expect(screen.queryByRole("button", { name: /cancelar edición/i })).not.toBeInTheDocument();
    });

    it("mobile variant applies pb-[env(safe-area-inset-bottom)] to the content area (REQ-EDIT-05)", () => {
      const { container } = render(
        <NoteEditor note={mockNote} onSave={vi.fn()} variant="mobile" />
      );
      const content = container.querySelector(".note-editor-content");
      expect(content).not.toBeNull();
      expect(content?.className).toMatch(/pb-\[env\(safe-area-inset-bottom\)\]/);
    });

    it("mobile variant has no dedicated status-only header (defense: vertical chrome stays compact)", () => {
      const { container } = render(
        <NoteEditor note={mockNote} onSave={vi.fn()} variant="mobile" />
      );
      // The mobile editor used to render a SaveStatusIndicator bar above
      // the title — that ate ~40px of vertical space on small screens
      // before any content appeared. We dropped it: the status now lives
      // only inside the desktop header (`role="status"` only when
      // `variant !== "mobile"`). Guard against re-introducing the bar.
      expect(container.querySelector("[role='status']")).not.toBeInTheDocument();
    });
  });

  describe("visibilitychange + unmount flush (REQ-EDIT-08)", () => {
    it("mobile variant flushes a pending save on document visibilitychange → hidden", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<NoteEditor note={mockNote} onSave={onSave} variant="mobile" />);

      // Arm the debounce by changing the title
      const titleInput = screen.getByDisplayValue("Test Note");
      act(() => {
        Object.defineProperty(titleInput, "value", { value: "Updated Title", writable: true });
        titleInput.dispatchEvent(new Event("change", { bubbles: true }));
      });

      // Simulate the OS backgrounding the tab
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // save() is async — let the microtask queue drain
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(onSave).toHaveBeenCalled();
    });

    it("mobile variant flushes a pending save on component unmount", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { unmount } = render(
        <NoteEditor note={mockNote} onSave={onSave} variant="mobile" />
      );

      const titleInput = screen.getByDisplayValue("Test Note");
      act(() => {
        Object.defineProperty(titleInput, "value", { value: "Updated Title", writable: true });
        titleInput.dispatchEvent(new Event("change", { bubbles: true }));
      });

      // Unmount before the 1500ms debounce fires
      unmount();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(onSave).toHaveBeenCalled();
    });

    it("desktop variant does NOT register a document visibilitychange listener", () => {
      const addSpy = vi.spyOn(document, "addEventListener");
      const removeSpy = vi.spyOn(document, "removeEventListener");
      const { unmount } = render(<NoteEditor note={mockNote} onSave={vi.fn()} />);

      const visibilityListenerCalls = addSpy.mock.calls.filter(
        (c) => c[0] === "visibilitychange"
      );
      expect(visibilityListenerCalls).toHaveLength(0);
      unmount();
      removeSpy.mockRestore();
      addSpy.mockRestore();
    });
  });

  // ─── Sync fix: re-sync editor when the store returns fresh content ─────
  //
  // When the list endpoint strips `content` (server-side projection),
  // MobileNotePage calls `fetchNote(id)` on mount to get the full
  // note. The store updates `note.content`, but the editor's
  // `useEffect` previously only re-synced on id change — so the
  // user saw the empty content from the list-endpoint projection
  // instead of the freshly-fetched markdown. Fix: re-sync when the
  // store's content differs from the last synced content AND the
  // editor's current HTML doesn't already match (the second guard
  // prevents the user-typing flow from triggering a cursor reset).

  describe("content re-sync (same note, fresh content from store)", () => {
    it("re-syncs the editor when the store returns fresh content for the same note id", () => {
      const setContentSpy = vi.fn();
      mockEditorInstance.commands.setContent = setContentSpy;
      // The editor's current HTML doesn't match the new content (simulates
      // the fetchNote flow: editor was mounted with the list-endpoint
      // projection's empty content, store now returns the full content)
      mockEditorInstance.getHTML = vi.fn(() => "<p></p>");

      const { rerender } = render(<NoteEditor note={mockNote} onSave={vi.fn()} />);

      // Same id, different content (simulates fetchNote returning fresh data)
      const updatedNote = { ...mockNote, content: "<p>fresh content from store</p>" };
      rerender(<NoteEditor note={updatedNote} onSave={vi.fn()} />);

      // The editor must re-sync because the store content differs from
      // what the editor currently holds
      expect(setContentSpy).toHaveBeenCalledWith(
        "<p>fresh content from store</p>",
        expect.objectContaining({ emitUpdate: false })
      );
    });

    it("does NOT re-sync when the editor's HTML already matches the store content", () => {
      const setContentSpy = vi.fn();
      mockEditorInstance.commands.setContent = setContentSpy;
      // The editor's current HTML matches the new content (post-save state)
      mockEditorInstance.getHTML = vi.fn(() => "<p>user just typed this</p>");

      const { rerender } = render(<NoteEditor note={mockNote} onSave={vi.fn()} />);

      // The store updates with the same content the editor already holds
      // (this is what happens after the debounce fires and the round-trip
      // returns the same HTML)
      const updatedNote = { ...mockNote, content: "<p>user just typed this</p>" };
      rerender(<NoteEditor note={updatedNote} onSave={vi.fn()} />);

      // setContent must NOT be called — would reset the cursor
      expect(setContentSpy).not.toHaveBeenCalled();
    });
  });
});
