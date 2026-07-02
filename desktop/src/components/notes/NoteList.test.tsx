import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NoteList } from "./NoteList";
import type { Note, Tab } from "../../types";

const mockNotes: Note[] = [
  {
    id: "n1",
    title: "React Hooks Guide",
    content: "Detailed guide about hooks",
    tabId: "t1",
    userId: "u1",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-02",
    tags: [],
  },
  {
    id: "n2",
    title: "TypeScript Tips",
    content: "Useful TS patterns",
    tabId: "t1",
    userId: "u1",
    createdAt: "2024-01-03",
    updatedAt: "2024-01-03",
    tags: [],
  },
];

describe("NoteList", () => {
  it("renders all provided notes", () => {
    render(
      <NoteList notes={mockNotes} activeNoteId={null} onNoteSelect={vi.fn()} onCreateNote={vi.fn()} />
    );

    expect(screen.getByText("React Hooks Guide")).toBeInTheDocument();
    expect(screen.getByText("TypeScript Tips")).toBeInTheDocument();
  });

  it("shows empty state when no notes and no search query", () => {
    render(
      <NoteList notes={[]} activeNoteId={null} onNoteSelect={vi.fn()} onCreateNote={vi.fn()} searchQuery="" />
    );

    expect(screen.getByText(/crea tu primera nota/i)).toBeInTheDocument();
  });

  it("shows no results message when no notes and search query present", () => {
    render(
      <NoteList
        notes={[]}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        searchQuery="nada"
      />
    );

    expect(screen.getByText(/no se encontraron notas para/i)).toBeInTheDocument();
    expect(screen.getByText(/nada/i)).toBeInTheDocument();
  });

  it("calls onNoteSelect with note id when note clicked", () => {
    const onNoteSelect = vi.fn();
    render(
      <NoteList notes={mockNotes} activeNoteId={null} onNoteSelect={onNoteSelect} onCreateNote={vi.fn()} />
    );

    fireEvent.click(screen.getByText("TypeScript Tips"));

    expect(onNoteSelect).toHaveBeenCalledWith("n2");
  });

  it("marks the active note with aria-current", () => {
    render(
      <NoteList notes={mockNotes} activeNoteId="n1" onNoteSelect={vi.fn()} onCreateNote={vi.fn()} />
    );

    const activeItem = screen.getByRole("button", { name: /React Hooks Guide/i });
    expect(activeItem).toHaveAttribute("aria-current", "true");
  });

  it("renders a button to create a new note", () => {
    render(
      <NoteList notes={mockNotes} activeNoteId={null} onNoteSelect={vi.fn()} onCreateNote={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: /nueva nota/i })).toBeInTheDocument();
  });

  it("calls onCreateNote when new note button clicked", () => {
    const onCreateNote = vi.fn();
    render(
      <NoteList notes={mockNotes} activeNoteId={null} onNoteSelect={vi.fn()} onCreateNote={onCreateNote} />
    );

    fireEvent.click(screen.getByRole("button", { name: /nueva nota/i }));

    expect(onCreateNote).toHaveBeenCalledTimes(1);
  });

  it("renders a delete button for each note when onDeleteNote is provided", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onDeleteNote={vi.fn()}
      />
    );

    const deleteButtons = screen.getAllByRole("button", { name: /eliminar nota/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it("calls onDeleteNote with note id when delete button clicked", () => {
    const onDeleteNote = vi.fn();
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onDeleteNote={onDeleteNote}
      />
    );

    const deleteButtons = screen.getAllByRole("button", { name: /eliminar nota/i });
    fireEvent.click(deleteButtons[0]);

    expect(onDeleteNote).toHaveBeenCalledWith("n1");
  });

  it("renders Pagination when pagination prop is provided and totalCount > pageSize", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        pagination={{
          page: 1,
          pageSize: 10,
          totalCount: 25,
          onPageChange: vi.fn(),
        }}
      />
    );

    expect(screen.getByText(/mostrando 1-10 de 25 notas/i)).toBeInTheDocument();
    expect(screen.getByText(/página 1 de 3/i)).toBeInTheDocument();
  });

  it("does not render Pagination when pagination prop is not provided", () => {
    render(
      <NoteList notes={mockNotes} activeNoteId={null} onNoteSelect={vi.fn()} onCreateNote={vi.fn()} />
    );

    expect(screen.queryByText(/mostrando/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/página/i)).not.toBeInTheDocument();
  });

  it("calls pagination onPageChange with correct page when Anterior/Siguiente clicked", () => {
    const onPageChange = vi.fn();
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        pagination={{
          page: 2,
          pageSize: 10,
          totalCount: 25,
          onPageChange,
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole("button", { name: /anterior/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  // ── Move-note DnD wiring ─────────────────────────────────────────────────

  it("renders a drag handle for each note when onMoveNote is provided", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveNote={vi.fn()}
      />
    );

    const handles = screen.getAllByTestId(/^note-handle-/);
    expect(handles).toHaveLength(2);
    expect(handles[0]).toHaveAttribute("data-testid", "note-handle-n1");
    expect(handles[1]).toHaveAttribute("data-testid", "note-handle-n2");
  });

  it("drag handle is a SIBLING of the note select button (not nested)", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveNote={vi.fn()}
      />
    );

    const handle = screen.getByTestId("note-handle-n1");
    const selectBtn = screen.getByRole("button", { name: /React Hooks Guide/i });
    // Both inside the same <li>; handle must NOT be inside the select button.
    expect(handle.contains(selectBtn)).toBe(false);
    expect(selectBtn.contains(handle)).toBe(false);
    expect(handle.parentElement).toBe(selectBtn.parentElement);
  });

  it("pointerdown on the drag handle does NOT trigger onNoteSelect", () => {
    const onNoteSelect = vi.fn();
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={onNoteSelect}
        onCreateNote={vi.fn()}
        onMoveNote={vi.fn()}
      />
    );

    fireEvent.pointerDown(screen.getByTestId("note-handle-n1"));

    expect(onNoteSelect).not.toHaveBeenCalled();
  });

  it("does not render drag handles when onMoveNote is not provided", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
      />
    );

    expect(screen.queryByTestId(/^note-handle-/)).not.toBeInTheDocument();
  });
});

// ── Tab badge eyebrow ─────────────────────────────────────────────────────

const mockTabs: Tab[] = [
  { id: "t1", name: "Trabajo", createdAt: "2024-01-01" },
  { id: "t2", name: "Personal", createdAt: "2024-01-01" },
];

describe("NoteList — tab badge eyebrow", () => {
  it("renders the note's tab name as an eyebrow above the title when tabs prop is provided", () => {
    render(
      <NoteList
        notes={mockNotes}
        tabs={mockTabs}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
      />
    );

    // Both notes (mockNotes both have tabId "t1" → "Trabajo") show the eyebrow.
    const eyebrows = screen.getAllByText("Trabajo");
    expect(eyebrows.length).toBeGreaterThanOrEqual(1);

    // The eyebrow sits BEFORE the title in DOM order (it's an eyebrow, not a suffix).
    const firstEyebrow = eyebrows[0];
    const firstTitle = screen.getByText("React Hooks Guide");
    expect(
      firstEyebrow.compareDocumentPosition(firstTitle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders each note's own tab name when notes belong to different tabs", () => {
    render(
      <NoteList
        notes={[
          { ...mockNotes[0], tabId: "t1" },
          { ...mockNotes[1], tabId: "t2" },
        ]}
        tabs={mockTabs}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
      />
    );

    expect(screen.getByText("Trabajo")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("omits the tab badge when note's tabId cannot be resolved in tabs (no crash)", () => {
    render(
      <NoteList
        notes={mockNotes}
        tabs={[mockTabs[1]]}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
      />
    );

    // Note is still rendered.
    expect(screen.getByText("React Hooks Guide")).toBeInTheDocument();
    // Tab name "Trabajo" is NOT rendered because tabs doesn't include t1.
    expect(screen.queryByText("Trabajo")).not.toBeInTheDocument();
    // No crash, no fallback placeholder like "—".
    expect(document.body.textContent).not.toMatch(/^—$/);
  });

  it("does not render any tab badge when tabs prop is not provided", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
      />
    );

    expect(screen.queryByText("Trabajo")).not.toBeInTheDocument();
    expect(screen.queryByText("Personal")).not.toBeInTheDocument();
  });
});

// ── Drag handle gutter layout ─────────────────────────────────────────────

describe("NoteList — drag handle gutter layout", () => {
  it("drag handle is not absolutely positioned over the card (lives in its own gutter)", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveNote={vi.fn()}
      />
    );

    const handle = screen.getByTestId("note-handle-n1");
    expect(handle.className).not.toMatch(/\babsolute\b/);
    expect(handle.className).not.toMatch(/\bfixed\b/);
  });

  it("drag handle is the first child of the note row <li> (left gutter position)", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveNote={vi.fn()}
      />
    );

    const handle = screen.getByTestId("note-handle-n1");
    const selectBtn = screen.getByRole("button", { name: /React Hooks Guide/i });

    // Sibling assertion (existing contract): same parent, neither nested in the other.
    expect(handle.parentElement).toBe(selectBtn.parentElement);
    expect(handle.contains(selectBtn)).toBe(false);
    expect(selectBtn.contains(handle)).toBe(false);

    // Position assertion: handle precedes the select button in DOM order
    // (visually left of the card in an LTR flex row).
    expect(
      handle.compareDocumentPosition(selectBtn) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

// ── Favorite star button (must be a sibling of the select button) ─────────

describe("NoteList — favorite star button", () => {
  it("favorite button is a SIBLING of the select button (no nested <button>)", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    const selectBtn = screen.getByRole("button", { name: /React Hooks Guide/i });
    // Scope to the FIRST note's favorite button (mockNotes has 2 notes → 2 favorite buttons).
    const favBtn = screen.getAllByRole("button", { name: /favorito/i })[0];

    // No descendant buttons inside the select button — guards against <button> inside <button>.
    expect(selectBtn.querySelector("button")).toBeNull();
    // Favorite is not nested inside the select button.
    expect(selectBtn.contains(favBtn)).toBe(false);
    // Both share the same <li> parent (sibling relationship).
    expect(favBtn.parentElement).toBe(selectBtn.parentElement);
  });

  it("clicking the favorite button calls onToggleFavorite and does NOT trigger onNoteSelect", () => {
    const onToggleFavorite = vi.fn();
    const onNoteSelect = vi.fn();
    render(
      <NoteList
        notes={[mockNotes[0]]}
        activeNoteId={null}
        onNoteSelect={onNoteSelect}
        onCreateNote={vi.fn()}
        onToggleFavorite={onToggleFavorite}
      />
    );

    const favBtn = screen.getByRole("button", { name: /favorito/i });
    fireEvent.click(favBtn);

    expect(onToggleFavorite).toHaveBeenCalledWith("n1");
    expect(onNoteSelect).not.toHaveBeenCalled();
  });

  it("favorite button is not rendered when onToggleFavorite is not provided", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /favorito/i })).not.toBeInTheDocument();
  });

  it("favorite button reflects note.isFavorite via aria-pressed", () => {
    render(
      <NoteList
        notes={[{ ...mockNotes[0], isFavorite: true }]}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    const favBtn = screen.getByRole("button", { name: /favorito/i });
    expect(favBtn).toHaveAttribute("aria-pressed", "true");
  });
});
