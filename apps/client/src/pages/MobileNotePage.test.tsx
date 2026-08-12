import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MobileNotePage } from "./MobileNotePage";

const SAMPLE_NOTE = {
  id: "abc-123",
  tabId: "tab-1",
  title: "Mi nota de prueba",
  content: "<p>Contenido de la nota</p>",
  tags: [],
  isFavorite: false,
  favoritedAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: null,
};

vi.mock("../stores/useNoteStore", () => ({
  useNoteStore: vi.fn(),
}));

import { useNoteStore } from "../stores/useNoteStore";

/**
 * MobileNotePage — wrapper around the viewer/editor pair that
 * resolves the `:id` route param to a note from the store.
 *
 * Default surface: read-only `<NoteViewer>` with `Compartir` + `Editar`
 * buttons (mirrors the wide-viewport split-view UX — same affordances on
 * both viewports). Tapping `Editar` flips a local `isEditing` flag and
 * swaps to `<NoteEditor variant="mobile">` with auto-save and the
 * bottom formatting toolbar.
 *
 * Loader: if the note isn't in the store yet, the page calls
 * `fetchNote(id)` on mount. Once the note resolves, the viewer
 * renders. A short flash of "Cargando…" covers the in-flight request.
 *
 * History: an earlier batch (`mobile-note-edit`) mounted the editor
 * directly on this route, hiding the share button on mobile. The
 * user reverted that decision — the test contract was rewritten to
 * match.
 */
describe("MobileNotePage — viewer-first surface (Compartir + Editar)", () => {
  // Preload the NoteViewer lazy chunk so the first test in the file
  // doesn't race the Suspense boundary on a cold start. The chunk
  // is cached after this resolves, so every test below pays 0 ms on
  // the lazy boundary. Without this, the first test intermittently
  // flakes on busy CI when the chunk takes >1s to fetch + instantiate.
  beforeAll(async () => {
    await import("../components/editor/NoteViewer");
  });

  beforeEach(() => {
    // Default: note is in the store and fetchNote resolves cleanly.
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [SAMPLE_NOTE],
      fetchNote: vi.fn().mockResolvedValue(SAMPLE_NOTE),
    } as never);
  });

  it("renders the note title via the viewer (NoteViewer h1)", async () => {
    render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );
    // The viewer renders the title as an h1 (not the editable input
    // that NoteEditor uses). The heading is the simplest user-visible
    // signal that the viewer reached the page.
    //
    // `findByRole` retries until the lazy chunk resolves (Suspense
    // fallback is the EditorSkeleton until then). The first test in
    // the file pays the cold-load cost on its own — a 10s ceiling is
    // generous on a busy machine; subsequent tests reuse the cached
    // chunk and finish in <500ms.
    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: "Mi nota de prueba" },
        { timeout: 10000 },
      ),
    ).toBeInTheDocument();
  });

  it("renders BOTH Compartir and Editar buttons on mobile (viewer-first)", async () => {
    render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );
    // The viewer's button row mirrors the wide-viewport split-view surface
    // so the mobile user gets the same affordances.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /compartir/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });

  it("mounts the viewer by default (note-viewer class, no note-editor yet)", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );
    // The viewer mounts `.note-viewer`; the editor mounts `.note-editor`.
    // Default state on mobile is the viewer — the editor only mounts
    // after the user taps Editar.
    await waitFor(() => {
      expect(container.querySelector(".note-viewer")).toBeInTheDocument();
    });
    expect(container.querySelector(".note-editor")).not.toBeInTheDocument();
  });

  it("calls fetchNote when the note is not in the store", async () => {
    const fetchNote = vi.fn().mockResolvedValue(SAMPLE_NOTE);
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [],
      fetchNote,
    } as never);

    render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchNote).toHaveBeenCalledWith("abc-123");
    });
  });

  it("shows an error state when fetchNote rejects", async () => {
    const fetchNote = vi.fn().mockRejectedValue(new Error("network down"));
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [],
      fetchNote,
    } as never);

    render(
      <MemoryRouter initialEntries={["/notes/missing-id"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no se pudo cargar|error/i)).toBeInTheDocument();
    });
  });

  it("clicking Editar swaps the viewer for the NoteEditor (mobile variant)", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Wait for the viewer to render so the Editar button is in the DOM.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    });
    expect(container.querySelector(".note-viewer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /editar/i }));

    // After tapping Editar, the editor mounts with the mobile
    // bottom toolbar (data-testid="editor-toolbar"). The viewer is
    // gone from the DOM (it's a swap, not a stack).
    await waitFor(() => {
      expect(container.querySelector(".note-editor")).toBeInTheDocument();
    });
    expect(container.querySelector('[data-testid="editor-toolbar"]')).toBeInTheDocument();
    expect(container.querySelector(".note-viewer")).not.toBeInTheDocument();
  });
});

// ─── PR3-hotfix regression guards ──────────────────────────────────────────
//
// Three regressions surfaced after the PR3 merge on `pr3-polish`:
//
//   A) NoteViewer rendered the "Sin contenido." fallback on mobile even
//      when the note in the store had 528 chars of markdown content
//      (incl. two code blocks). Root cause: the list endpoint
//      (`GET /api/notes`) returns notes WITHOUT the `content` field
//      (server-side projection to keep the list payload small), so the
//      store had the note with `content: ""` after the user landed on
//      the home view. MobileNotePage's useEffect guarded
//      `if (note) return;` — the note IS in the store (just empty),
//      so the early-return skipped fetchNote, and the full content
//      never made it into the store. Fix: guard on
//      `if (note?.content) return;` so the detail is re-fetched when
//      the existing store entry has no content.
//
//   B) `.note-viewer` used `px-8` (32px each side) at all viewports,
//      wasting 64px on a 375px mobile screen. Fix: `px-4 md:px-8` for
//      responsive padding (preserves REQ-LAY-01 wide-viewport-pixel-identical
//      at >=768).
//
// The earlier `Editar`-button-hidden-on-mobile assertion was reverted
// when the user chose the viewer-first UX (the button is now present
// on both viewports). That contract lives in `NoteViewer.test.tsx`.

describe("MobileNotePage — PR3-hotfix viewer mobile regressions", () => {
  beforeEach(() => {
    // Default: mobile viewport (matches the production bug at 375×812).
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("767"),
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

  // Test A — "Sin contenido" regression
  it("fetches the full note via fetchNote when the store entry has empty content (list-endpoint strip)", async () => {
    // The list endpoint does NOT include the `content` field — so the
    // store entry from fetchNotes() has `content: ""`. The fix is to
    // trigger fetchNote on mount in that case so the viewer gets the
    // full content.
    const listStrippedNote = { ...SAMPLE_NOTE, content: "" };
    const fetchNote = vi.fn().mockResolvedValue(SAMPLE_NOTE);
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [listStrippedNote],
      fetchNote,
    } as never);

    render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchNote).toHaveBeenCalledWith("abc-123");
    });
  });

  it("does NOT re-fetch when the store entry already has full content", async () => {
    // Regression guard: the fix must not trigger an extra fetch when
    // the note in the store is already complete.
    const fetchNote = vi.fn().mockResolvedValue(SAMPLE_NOTE);
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [SAMPLE_NOTE],
      fetchNote,
    } as never);

    render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Give the effect a tick to run.
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchNote).not.toHaveBeenCalled();
  });

  it("renders the TipTap viewer (ProseMirror + code blocks) when the note has full MARKDOWN content", async () => {
    // The actual user-facing assertion: TipTap mounts AND the
    // markdown is parsed so the two fenced code blocks render as
    // <pre> blocks (not as a single <p> of literal markdown text).
    //
    // Notes.Api stores note content as MARKDOWN (see API response in
    // docs — content field carries ```typescript ...``` source). The
    // viewer must run the content through the tiptap-markdown parser
    // for code blocks to surface as <pre>. This test uses REAL
    // markdown content (not HTML) to match the production shape and
    // catch the regression where the viewer was missing the Markdown
    // extension.
    //
    // Note on `pre` count: NoteViewer's codeBlock node view wraps
    // the highlighted content in a <pre>. We assert on <pre> (the
    // user-visible "code block" surface).
    const noteWithMarkdownCodeBlocks = {
      ...SAMPLE_NOTE,
      content:
        '# Code Block Test\n\n' +
        'Acá va un code block ancho:\n\n' +
        '```typescript\n' +
        'interface UserPreferences {\n' +
        '  theme: "dark" | "light" | "system";\n' +
        '}\n' +
        '```\n\n' +
        'Y uno más con SQL largo:\n\n' +
        '```sql\n' +
        'SELECT u.email, COUNT(n.id) AS note_count\n' +
        'FROM users u LEFT JOIN notes n ON n.user_id = u.id\n' +
        'GROUP BY u.id, u.email HAVING COUNT(n.id) > 5;\n' +
        '```\n',
    };
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [noteWithMarkdownCodeBlocks],
      fetchNote: vi.fn().mockResolvedValue(noteWithMarkdownCodeBlocks),
    } as never);

    const { container } = render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(container.querySelectorAll(".ProseMirror").length).toBeGreaterThanOrEqual(1);
    });
    expect(container.querySelectorAll("pre").length).toBeGreaterThanOrEqual(2);
  });
});

// ─── mobile-note-edit (REQ-EDIT-01..08) ────────────────────────────────────
//
// The mobile editor still exists — it's just not the default surface.
// Tapping `Editar` in the viewer swaps to the editor; tapping the
// MobileShell back chevron returns to the home list (and the editor
// flushes any pending auto-save via REQ-EDIT-08's visibilitychange
// + unmount handler).

describe("MobileNotePage — viewer→editor flow (REQ-EDIT-01..08)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("767"),
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

  it("does NOT mount NoteEditor by default — only after Editar is tapped", () => {
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [SAMPLE_NOTE],
      fetchNote: vi.fn().mockResolvedValue(SAMPLE_NOTE),
    } as never);

    const { container } = render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Default = viewer only.
    expect(container.querySelector(".note-viewer")).toBeInTheDocument();
    expect(container.querySelector(".note-editor")).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="editor-toolbar"]'),
    ).not.toBeInTheDocument();
  });

  it("after tapping Editar, applies safe-area-inset-bottom padding on .note-editor-content (REQ-EDIT-05)", async () => {
    const user = userEvent.setup();
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [SAMPLE_NOTE],
      fetchNote: vi.fn().mockResolvedValue(SAMPLE_NOTE),
    } as never);

    const { container } = render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /editar/i }));

    // The mobile editor mounts `.note-editor-content` with
    // `pb-[env(safe-area-inset-bottom)]` so the virtual keyboard
    // never covers the last line.
    await waitFor(() => {
      expect(container.querySelector(".note-editor-content")).toBeInTheDocument();
    });
    expect(container.querySelector(".note-editor-content")?.className).toMatch(
      /pb-\[env\(safe-area-inset-bottom\)\]/,
    );
  });

  it("after tapping Editar, does NOT render wide-viewport Guardar / Cancelar buttons (mobile variant status-only)", async () => {
    const user = userEvent.setup();
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [SAMPLE_NOTE],
      fetchNote: vi.fn().mockResolvedValue(SAMPLE_NOTE),
    } as never);

    render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /editar/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /guardar nota/i })).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /cancelar edición/i }),
    ).not.toBeInTheDocument();
  });
});