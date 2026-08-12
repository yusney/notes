import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { NoteViewer } from "./NoteViewer";
import type { Note } from "../../types";
import { useEditor } from "@tiptap/react";

/**
 * Helper: render NoteViewer inside MemoryRouter so any future router
 * hook (`useNavigate`, `useLocation`, etc.) finds a router context.
 * Default initialEntries to a route that includes state — keeps the
 * helper robust to future route-state interactions without locking
 * the test contract to today's state shape.
 */
function renderViewer(props: { note?: Note; onEdit?: () => void } = {}) {
  const note = props.note ?? mockNote;
  const onEdit = props.onEdit ?? vi.fn();
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/notes/n1", state: { scrollY: 47 } }]}>
      <NoteViewer note={note} onEdit={onEdit} />
    </MemoryRouter>
  );
}

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
  // NoteEditor's `CodeBlockTabExtension` lives in extensions.tsx (extracted
  // for fast-refresh). We mock it as a no-op class so the viewer test
  // can import the extension array without the real TipTap Extension.
  Extension: { create: vi.fn(() => ({})) },
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

  // Wrap every render in a MemoryRouter via the wrapper option —
  // keeps each test inline without nesting MemoryRouter in JSX.
  const routerWrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );

  it("renders the note title", () => {
    render(<NoteViewer note={mockNote} onEdit={vi.fn()} />, { wrapper: routerWrapper });
    expect(screen.getByText("Viewer Note")).toBeInTheDocument();
  });

  it("renders the viewer content area", () => {
    render(<NoteViewer note={mockNote} onEdit={vi.fn()} />, { wrapper: routerWrapper });
    expect(screen.getByTestId("viewer-content")).toBeInTheDocument();
  });

  it("renders an Edit button", () => {
    render(<NoteViewer note={mockNote} onEdit={vi.fn()} />, { wrapper: routerWrapper });
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });

  // ─── Task/Link rendering — RED tests ───────────────────────────────────────

  describe("task list rendering", () => {
    it("configures useEditor with TaskList extension", () => {
      render(<NoteViewer note={mockNote} onEdit={vi.fn()} />, { wrapper: routerWrapper });
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<{ _ext?: string }>;
      const taskList = extensions.find((e) => e._ext === "TaskList");
      expect(taskList).toBeDefined();
    });

    it("configures TaskItem with nested: false (read-only enforced by useEditor editable: false)", () => {
      render(<NoteViewer note={mockNote} onEdit={vi.fn()} />, { wrapper: routerWrapper });
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<{ _ext?: string; _opts?: Record<string, unknown> }>;
      const taskItem = extensions.find((e) => e._ext === "TaskItem");
      expect(taskItem).toBeDefined();
      expect(taskItem?._opts).toMatchObject({ nested: false });
    });
  });

  describe("task list checkbox CSS — viewer context (read-only)", () => {
    it("viewer root has class 'note-viewer' for CSS scoping of pointer-events: none on checkboxes", () => {
      const { container } = render(<NoteViewer note={mockNote} onEdit={vi.fn()} />, { wrapper: routerWrapper });
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
      const { container } = render(<NoteViewer note={mockNote} onEdit={vi.fn()} />, { wrapper: routerWrapper });
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
      render(<NoteViewer note={mockNote} onEdit={vi.fn()} />, { wrapper: routerWrapper });
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<{ _ext?: string; _opts?: Record<string, unknown> }>;
      const linkExt = extensions.find((e) => e._ext === "Link");
      expect(linkExt).toBeDefined();
      expect(linkExt?._opts).toMatchObject({ openOnClick: true });
    });

    it("configures Link extension with target _blank for external browser", () => {
      render(<NoteViewer note={mockNote} onEdit={vi.fn()} />, { wrapper: routerWrapper });
      const useEditorMock = vi.mocked(useEditor);
      const callArgs = useEditorMock.mock.calls[0]?.[0];
      const extensions = (callArgs?.extensions ?? []) as unknown as Array<{ _ext?: string; _opts?: Record<string, unknown> }>;
      const linkExt = extensions.find((e) => e._ext === "Link");
      const htmlAttrs = linkExt?._opts?.HTMLAttributes as Record<string, string> | undefined;
      expect(htmlAttrs?.target).toBe("_blank");
      expect(htmlAttrs?.rel).toBe("noopener noreferrer");
    });
  });
});

// ── Mobile Edit button (mirror wide-viewport surface) ─────────────────────────────
//
// The viewer used to hide the `Editar` button on mobile
// (REQ-VIEW-01 read-only v1.0). The user reverted that decision so the
// mobile surface mirrors the wide-viewport one: Compartir + Editar visible on
// both viewports. The parent's `onEdit` callback owns the transition
// (MainLayout swaps to NoteEditor on wide viewports; MobileNotePage flips a
// local `isEditing` flag on mobile).
//
// `Compartir` is always rendered — the ShareDialog handles its own
// viewport sizing, and the mobile user needs the same share affordance
// the wide viewport has.

describe("NoteViewer — mobile surface mirrors wide-viewport (Compartir + Editar)", () => {
  beforeEach(() => {
    // Reset matchMedia so each test controls the viewport independently.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  function setMobileViewport(matches: boolean) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("767") ? matches : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  it("renders BOTH Compartir and Editar buttons on mobile (≤767px)", () => {
    setMobileViewport(true);

    renderViewer();

    expect(screen.getByRole("button", { name: /compartir/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });

  it("renders BOTH Compartir and Editar buttons on wide viewports (≥768px)", () => {
    setMobileViewport(false);

    renderViewer();

    expect(screen.getByRole("button", { name: /compartir/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });

  it("does NOT render an internal back chevron on mobile (MobileShell AppBar owns it)", () => {
    // NoteViewer's old contract was to render its own `← Volver` button
    // on mobile. After the MobileShell refactor, the AppBar already
    // provides one — a second chevron would compete for the same thumb
    // zone and confuse the user about which one navigates where.
    setMobileViewport(true);

    const { container } = renderViewer();

    // No element with `aria-label` containing volver/atrás/back.
    expect(
      container.querySelector('[aria-label*="volver" i], [aria-label*="atrás" i], [aria-label*="back" i]')
    ).not.toBeInTheDocument();
  });

  it("clicking Editar on mobile invokes onEdit (parent decides the transition)", async () => {
    setMobileViewport(true);
    const onEdit = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NoteViewer note={mockNote} onEdit={onEdit} />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /editar/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("stacks the header vertically + centres title + buttons on mobile (≤767px)", () => {
    // Regression guard for the "no está centrado / no cubre todo"
    // report. The previous split layout (title left, buttons right)
    // wasted the middle of the bar on a narrow viewport. The mobile
    // header now stacks vertically and centres the title + the
    // buttons-row. The action row is `w-full` (no `max-w` cap) so
    // Compartir + Editar together cover the full header width on
    // wider phones instead of leaving whitespace on the right.
    setMobileViewport(true);

    const { container } = renderViewer();

    // The header root is the first flex container inside the viewer's
    // outer wrapper. We assert by its stacking + centring classes.
    const header = container.querySelector(".flex.shrink-0.flex-col");
    expect(header).toBeInTheDocument();
    expect(header?.className).toMatch(/items-center/);

    // The title is centred on mobile.
    const title = container.querySelector("h1");
    expect(title?.className).toMatch(/text-center/);

    // The buttons row covers the full header width on mobile — no
    // `max-w-xs` cap that would leave whitespace on the sides.
    const buttonRow = header?.querySelector("div.flex.w-full");
    expect(buttonRow).toBeInTheDocument();
    expect(buttonRow?.className).not.toMatch(/max-w-xs/);

    // Each button takes flex-1 so they share the row evenly.
    const buttons = buttonRow?.querySelectorAll("button");
    buttons?.forEach((btn) => {
      expect(btn.className).toMatch(/flex-1/);
    });
  });

  it("uses the split (title left, buttons right) layout on wide viewports (≥768px)", () => {
    // REQ-WIDE-01 / S9: the wide-viewport split-view surface must stay
    // byte-identical with the pre-mobile-v1 baseline. The mobile stack
    // is opt-in via Tailwind responsive classes — `md:` reverts the
    // header back to the row layout.
    setMobileViewport(false);

    const { container } = renderViewer();

    const header = container.querySelector(".flex.shrink-0.flex-col");
    // On wide viewports the flex-col class is overridden by md:flex-row.
    // Tailwind applies the responsive class, so the DOM keeps both
    // classes — we assert the responsive override is present.
    expect(header?.className).toMatch(/md:flex-row/);
    expect(header?.className).toMatch(/md:justify-between/);

    // Title aligns left on wide viewports.
    const title = container.querySelector("h1");
    expect(title?.className).toMatch(/md:text-left/);
  });
});

// ── Empty-state layout (covers the available space, not just a paragraph) ──
//
// Regression guard for the mobile "no cubre bien los espacios" report.
// When the note has empty content the viewer used to render a small
// "Sin contenido." paragraph at the TOP of a large empty scroll area
// — the empty space dominated the viewport and looked broken. The
// fix renders a centred empty state with an icon, prompt, and CTA
// that calls `onEdit` so the user lands directly in the editor.

describe("NoteViewer — empty-state layout", () => {
  it("renders a centred empty state with 'Empezar a escribir' CTA when note.content is empty", () => {
    const emptyNote: Note = { ...mockNote, content: "" };
    const onEdit = vi.fn();

    const { container } = render(
      <MemoryRouter>
        <NoteViewer note={emptyNote} onEdit={onEdit} />
      </MemoryRouter>
    );

    // The empty-state container is identified by data-testid so
    // tests don't depend on Tailwind class strings.
    const emptyState = container.querySelector('[data-testid="viewer-empty-state"]');
    expect(emptyState).toBeInTheDocument();

    // Centred layout — flex items-center + justify-center cover the
    // available scroll area instead of leaving the empty paragraph
    // pinned to the top of a tall blank column.
    expect(emptyState?.className).toMatch(/items-center/);
    expect(emptyState?.className).toMatch(/justify-center/);
    expect(emptyState?.className).toMatch(/h-full/);

    // The empty-state now wraps its contents in a dashed-border card
    // so the affordance has visual weight on a phone screen instead
    // of looking like a lonely paragraph in a big blank area.
    const card = emptyState?.querySelector("div");
    expect(card?.className).toMatch(/rounded-2xl/);
    expect(card?.className).toMatch(/border-dashed/);

    // The card covers the full content-area width on mobile (`w-full`,
    // no `max-w-xs` cap) so it doesn't leave whitespace on the right
    // side of wider phones. The cap is opt-in for wide-viewport only via
    // `md:max-w-xs` so the card stays a narrow readable strip in the
    // wide-viewport split-view right pane.
    expect(card?.className).toMatch(/w-full/);
    expect(card?.className).not.toMatch(/^\S*max-w-xs/); // no bare `max-w-xs`
    expect(card?.className).toMatch(/md:max-w-xs/);

    // CTA button — text content + onEdit wire-up.
    const cta = screen.getByRole("button", { name: /empezar a escribir/i });
    expect(cta).toBeInTheDocument();
  });

  it("clicking the 'Empezar a escribir' CTA invokes onEdit", async () => {
    const emptyNote: Note = { ...mockNote, content: "" };
    const onEdit = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NoteViewer note={emptyNote} onEdit={onEdit} />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /empezar a escribir/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("does NOT render the empty state when note has content", () => {
    const { container } = render(
      <MemoryRouter>
        <NoteViewer note={mockNote} onEdit={vi.fn()} />
      </MemoryRouter>
    );

    expect(container.querySelector('[data-testid="viewer-empty-state"]')).not.toBeInTheDocument();
  });
});
