import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NoteList } from "./NoteList";
import type { Note } from "../../types";

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: "n1",
  title: "Test Note",
  content: "Content",
  tabId: "t1",
  userId: "u1",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  tags: [],
  isFavorite: false,
  ...overrides,
});

describe("NoteList - favorites and sort features", () => {
  it("renders a star button for each note", () => {
    const notes = [makeNote({ id: "n1" }), makeNote({ id: "n2", title: "Other" })];
    render(
      <NoteList
        notes={notes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    const stars = screen.getAllByRole("button", { name: /favorito/i });
    expect(stars).toHaveLength(2);
  });

  it("calls onToggleFavorite with note id when star clicked", () => {
    const onToggleFavorite = vi.fn();
    const notes = [makeNote({ id: "n1" }), makeNote({ id: "n2", title: "Other" })];
    render(
      <NoteList
        notes={notes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onToggleFavorite={onToggleFavorite}
      />
    );

    const stars = screen.getAllByRole("button", { name: /favorito/i });
    fireEvent.click(stars[0]);

    expect(onToggleFavorite).toHaveBeenCalledWith("n1");
  });

  it("shows filled star for favorite notes", () => {
    const notes = [makeNote({ id: "n1", isFavorite: true })];
    render(
      <NoteList
        notes={notes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    const star = screen.getByRole("button", { name: /favorito/i });
    expect(star).toHaveAttribute("aria-pressed", "true");
  });

  it("renders sort dropdown with creation/modification/alphabetical options", () => {
    render(
      <NoteList
        notes={[]}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        sortBy="creation"
        onSortChange={vi.fn()}
      />
    );

    const select = screen.getByRole("combobox", { name: /ordenar por/i });
    expect(select).toBeInTheDocument();
  });

  it("calls onSortChange when sort dropdown changes", async () => {
    const onSortChange = vi.fn();
    render(
      <NoteList
        notes={[]}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        sortBy="creation"
        onSortChange={onSortChange}
      />
    );

    // Open the custom select
    fireEvent.click(screen.getByRole("combobox", { name: /ordenar por/i }));
    // Click the "Alfabético" option
    fireEvent.click(screen.getByRole("option", { name: /alfabético/i }));

    expect(onSortChange).toHaveBeenCalledWith("alphabetical");
  });

  it("renders favorite filter toggle button", () => {
    render(
      <NoteList
        notes={[]}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        isFavoriteOnly={false}
        onFavoriteFilterToggle={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /solo favoritos/i })).toBeInTheDocument();
  });

  it("calls onFavoriteFilterToggle when favorite filter button clicked", () => {
    const onFavoriteFilterToggle = vi.fn();
    render(
      <NoteList
        notes={[]}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        isFavoriteOnly={false}
        onFavoriteFilterToggle={onFavoriteFilterToggle}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /solo favoritos/i }));

    expect(onFavoriteFilterToggle).toHaveBeenCalledTimes(1);
  });
});
