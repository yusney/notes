import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NoteList } from "./NoteList";
import type { Note } from "../../types";

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
});
