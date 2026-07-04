import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
 * MobileNotePage — wrapper around NoteViewer that resolves the `:id`
 * route param to a note from the store and renders read-only.
 *
 * Loader: if the note isn't in the store yet, the page calls
 * `fetchNote(id)` on mount. Once the note resolves, the viewer
 * renders. A short flash of "Cargando…" covers the in-flight request.
 *
 * REQ-VIEW-01: mobile is always read-only. We deliberately don't
 * render the Editar button — desktop callers can opt in but the
 * mobile wrapper forces read-only by passing `readOnly` through.
 */
describe("MobileNotePage (PR2 — shell-redesign-v1)", () => {
  beforeEach(() => {
    // Default: note is in the store and fetchNote resolves cleanly.
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [SAMPLE_NOTE],
      fetchNote: vi.fn().mockResolvedValue(SAMPLE_NOTE),
    } as never);
  });

  it("renders the note title from the store when :id resolves", async () => {
    render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /mi nota de prueba/i })).toBeInTheDocument();
    });
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

  it("renders the note title via the editor surface (NoteViewer mounted on the route)", async () => {
    // This test confirms that the page MOUNTS NoteViewer (the
    // user-visible outcome of a successful render). The MobileShell
    // wraps the page in App.tsx and provides the route-level back
    // chevron — that contract is exercised in MobileShell.test.tsx.
    // Here we just assert the viewer reached the page (heading is
    // the simplest user-visible signal).
    render(
      <MemoryRouter initialEntries={["/notes/abc-123"]}>
        <Routes>
          <Route path="/notes/:id" element={<MobileNotePage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /mi nota de prueba/i })).toBeInTheDocument();
    });
  });
});

// ─── shell-redesign-v1 PR3-hotfix (viewer mobile regressions) ───────────────
//
// Three regressions surfaced after the PR3 merge on `pr3-polish`:
//
//   A) NoteViewer renders the "Sin contenido." fallback on mobile even
//      when the note in the store has 528 chars of markdown content
//      (incl. two code blocks). Root cause: the list endpoint
//      (`GET /api/notes`) returns notes WITHOUT the `content` field
//      (server-side projection to keep the list payload small), so the
//      store has the note with `content: ""` after the user lands on
//      the home view. MobileNotePage's useEffect guarded
//      `if (note) return;` — the note IS in the store (just empty),
//      so the early-return skipped fetchNote, and the full content
//      never made it into the store. NoteViewer then rendered the
//      "Sin contenido" fallback instead of TipTap. Fix: guard on
//      `if (note?.content) return;` so the detail is re-fetched when
//      the existing store entry has no content.
//
//   B) "Editar" button leaked into mobile — REQ-VIEW-01 says mobile
//      v1.0 is read-only. NoteViewer's button had no `isMobile` gate
//      so the desktop-only affordance was visible on mobile.
//
//   C) `.note-viewer` used `px-8` (32px each side) at all viewports,
//      wasting 64px on a 375px mobile screen. Fix: `px-4 md:px-8` for
//      responsive padding (preserves REQ-LAY-01 desktop-pixel-identical
//      at >=768).

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

  it("renders the TipTap editor (ProseMirror + code blocks) when the note has full MARKDOWN content", async () => {
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

  // Test B — "Editar" button on mobile
  it("does NOT render the 'Editar' button on mobile (REQ-VIEW-01 read-only)", () => {
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

    expect(
      screen.queryByRole("button", { name: /editar/i })
    ).not.toBeInTheDocument();
  });

  it("renders the 'Editar' button on desktop (regression guard for NoteViewer's existing desktop contract)", () => {
    // Override matchMedia to desktop (>=768px).
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

    expect(
      screen.getByRole("button", { name: /editar/i })
    ).toBeInTheDocument();
  });

  // Test C — mobile padding
  it("uses tight padding (px-4) on mobile so 375px viewports do not waste 64px on the viewer chrome", () => {
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

    const viewer = container.querySelector(".note-viewer");
    expect(viewer).toBeInTheDocument();
    // Tailwind 4 compiles px-4 to `padding-inline: 1rem` (16px) and
    // md:px-8 to `padding-inline: 2rem` (32px) at >=768px. The base
    // class is what determines the mobile padding.
    const className = (viewer as HTMLElement).className;
    expect(className).toMatch(/(^|\s)px-4(\s|$)/);
    // Desktop padding is preserved via md:px-8 (REQ-LAY-01).
    expect(className).toMatch(/(^|\s)md:px-8(\s|$)/);
  });
});