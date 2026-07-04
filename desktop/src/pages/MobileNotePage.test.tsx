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