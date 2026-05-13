import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { NoteEditor } from "./NoteEditor";
import type { Note, Tag } from "../../types";

// Mock editor with getHTML so we can verify the save path reads from it
const mockGetHTML = vi.fn(() => "<p>content from editor</p>");
const mockEditorInstance = {
  getHTML: mockGetHTML,
  isActive: vi.fn(() => false),
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
    })),
  })),
  commands: { setContent: vi.fn() },
};

// TipTap doesn't fully work in jsdom — we test the wrapper behavior
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => mockEditorInstance),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content" data-editor={editor ? "ready" : "loading"} />
  ),
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
});
