import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoteViewer } from "./NoteViewer";
import type { Note } from "../../types";
import { useEditor } from "@tiptap/react";

// ─── Extension mocks ─────────────────────────────────────────────────────────

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

// ─── TipTap mock ─────────────────────────────────────────────────────────────

const mockViewerInstance = {
  getHTML: vi.fn(() => ""),
  isActive: vi.fn(() => false),
  getText: vi.fn(() => ""),
  commands: { setContent: vi.fn() },
  chain: vi.fn(),
};

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => mockViewerInstance),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="viewer-content" data-editor={editor ? "ready" : "loading"} />
  ),
  ReactNodeViewRenderer: vi.fn(() => vi.fn()),
  NodeViewWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  NodeViewContent: () => <div />,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockNote: Note = {
  id: "n1",
  title: "Viewer Note",
  content: "<p>Hello</p>",
  tabId: "t1",
  userId: "u1",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  tags: [],
};

describe("NoteViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the note title", () => {
    render(<NoteViewer note={mockNote} onEdit={vi.fn()} />);
    expect(screen.getByText("Viewer Note")).toBeInTheDocument();
  });

  it("renders the viewer content area", () => {
    render(<NoteViewer note={mockNote} onEdit={vi.fn()} />);
    expect(screen.getByTestId("viewer-content")).toBeInTheDocument();
  });

  it("renders an Edit button", () => {
    render(<NoteViewer note={mockNote} onEdit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });

  // ─── Task/Link rendering — RED tests ───────────────────────────────────────

  describe("task list rendering", () => {
    it("configures useEditor with TaskList extension", () => {
      render(<NoteViewer note={mockNote} onEdit={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions: Array<{ _ext?: string }> = callArgs?.extensions ?? [];
      const taskList = extensions.find((e) => e._ext === "TaskList");
      expect(taskList).toBeDefined();
    });

    it("configures TaskItem with editable: false for read-only checkboxes", () => {
      render(<NoteViewer note={mockNote} onEdit={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions: Array<{ _ext?: string; _opts?: Record<string, unknown> }> =
        callArgs?.extensions ?? [];
      const taskItem = extensions.find((e) => e._ext === "TaskItem");
      expect(taskItem).toBeDefined();
      expect(taskItem?._opts).toMatchObject({ editable: false, nested: false });
    });
  });

  describe("task list checkbox CSS — viewer context (read-only)", () => {
    it("viewer root has class 'note-viewer' for CSS scoping of pointer-events: none on checkboxes", () => {
      const { container } = render(<NoteViewer note={mockNote} onEdit={vi.fn()} />);
      // The outermost viewer wrapper must carry .note-viewer so the CSS rule
      // `.note-viewer ... input[type="checkbox"] { pointer-events: none; cursor: default }`
      // is active and checkboxes are non-interactive
      const viewerRoot = container.querySelector(".note-viewer");
      expect(viewerRoot).toBeInTheDocument();
    });

    it("index.css contains pointer-events:none rule for checkboxes in viewer", () => {
      // RED: verifies CSS rule exists. Fails until rule is added to index.css.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      const path = require("path") as typeof import("path");
      const cssPath = path.resolve(__dirname, "../../../src/index.css");
      const css = fs.readFileSync(cssPath, "utf-8");
      expect(css).toMatch(/\.note-viewer[^}]*pointer-events\s*:\s*none/s);
    });
  });

  describe("link CSS — viewer context", () => {
    it("viewer root has class 'note-viewer' for CSS scoping of link color and underline", () => {
      const { container } = render(<NoteViewer note={mockNote} onEdit={vi.fn()} />);
      // .note-viewer scoping ensures links get color + underline override via CSS
      const viewerRoot = container.querySelector(".note-viewer");
      expect(viewerRoot).toBeInTheDocument();
    });

    it("index.css contains link color and text-decoration rules in viewer", () => {
      // RED: verifies CSS rule exists. Fails until rule is added to index.css.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      const path = require("path") as typeof import("path");
      const cssPath = path.resolve(__dirname, "../../../src/index.css");
      const css = fs.readFileSync(cssPath, "utf-8");
      expect(css).toMatch(/\.note-viewer[^}]*text-decoration\s*:\s*underline/s);
    });
  });

  describe("link rendering", () => {
    it("configures Link extension with openOnClick: true", () => {
      render(<NoteViewer note={mockNote} onEdit={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions: Array<{ _ext?: string; _opts?: Record<string, unknown> }> =
        callArgs?.extensions ?? [];
      const linkExt = extensions.find((e) => e._ext === "Link");
      expect(linkExt).toBeDefined();
      expect(linkExt?._opts).toMatchObject({ openOnClick: true });
    });

    it("configures Link extension with target _blank for external browser", () => {
      render(<NoteViewer note={mockNote} onEdit={vi.fn()} />);
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions: Array<{ _ext?: string; _opts?: Record<string, unknown> }> =
        callArgs?.extensions ?? [];
      const linkExt = extensions.find((e) => e._ext === "Link");
      const htmlAttrs = linkExt?._opts?.HTMLAttributes as Record<string, string> | undefined;
      expect(htmlAttrs?.target).toBe("_blank");
      expect(htmlAttrs?.rel).toBe("noopener noreferrer");
    });
  });
});
