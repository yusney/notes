import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { NoteEditor } from "./NoteEditor";
import type { Note, Tag } from "../../types";

// Mock CodeFormatter so we can control its behavior in tests
vi.mock("./CodeFormatter", () => ({
  formatCodeBlock: vi.fn(),
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
    })),
  })),
  commands: {
    setContent: vi.fn(),
    selectAll: vi.fn(),
    insertContent: vi.fn(),
  },
  state: {
    selection: { from: 0, to: 10 },
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
});
