import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("renders a drag handle for each note when enableDrag is true", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        enableDrag={true}
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
        enableDrag={true}
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
        enableDrag={true}
      />
    );

    fireEvent.pointerDown(screen.getByTestId("note-handle-n1"));

    expect(onNoteSelect).not.toHaveBeenCalled();
  });

  it("does not render drag handles when enableDrag is false (or omitted)", () => {
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
        enableDrag={true}
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
        enableDrag={true}
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

// ── "Mover a..." accessible menu (issue #9 explicit a11y criterion) ───────
//
// Closes the gap that the @dnd-kit KeyboardSensor alone did not satisfy:
// "a discoverable, keyboard-operable alternative to drag-and-drop to move a
// note between tabs." See PR #13 review.
//
// These tests run in CI via `pnpm vitest run` (jsdom, no backend) — they
// REPLACE the false confidence of the skipping E2E for this flow.

describe("NoteList — 'Mover a...' accessible menu", () => {
  const tabsForMove: Tab[] = [
    { id: "t1", name: "Trabajo", createdAt: "2024-01-01" },
    { id: "t2", name: "Personal", createdAt: "2024-01-01" },
    { id: "t3", name: "Proyectos", createdAt: "2024-01-01" },
  ];

  it("renders a 'Mover nota a otro espacio' trigger per note when onMoveToTab is provided", () => {
    render(
      <NoteList
        notes={mockNotes}
        tabs={tabsForMove}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveToTab={vi.fn()}
      />
    );

    const triggers = screen.getAllByRole("button", { name: /mover nota a otro espacio/i });
    expect(triggers).toHaveLength(2);
  });

  it("'Mover a...' trigger is a SIBLING of the select button (no nested <button>)", () => {
    render(
      <NoteList
        notes={mockNotes}
        tabs={tabsForMove}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveToTab={vi.fn()}
      />
    );

    const selectBtn = screen.getByRole("button", { name: /React Hooks Guide/i });
    const trigger = screen.getAllByRole("button", { name: /mover nota a otro espacio/i })[0];

    // No descendant buttons inside the select button — guards against <button> inside <button>.
    expect(selectBtn.querySelector("button")).toBeNull();
    expect(selectBtn.contains(trigger)).toBe(false);
    // Same parent = sibling relationship (mirrors the drag handle / favorite contract).
    expect(trigger.parentElement).toBe(selectBtn.parentElement);
  });

  it("trigger declares aria-haspopup='dialog' to advertise it opens a dialog", () => {
    render(
      <NoteList
        notes={mockNotes}
        tabs={tabsForMove}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveToTab={vi.fn()}
      />
    );

    const trigger = screen.getAllByRole("button", { name: /mover nota a otro espacio/i })[0];
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("does not render the 'Mover a...' trigger when onMoveToTab is not provided", () => {
    render(
      <NoteList
        notes={mockNotes}
        tabs={tabsForMove}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: /mover nota a otro espacio/i })
    ).not.toBeInTheDocument();
  });

  it("clicking the trigger does NOT trigger onNoteSelect (event isolation)", () => {
    const onNoteSelect = vi.fn();
    render(
      <NoteList
        notes={[mockNotes[0]]}
        tabs={tabsForMove}
        activeNoteId={null}
        onNoteSelect={onNoteSelect}
        onCreateNote={vi.fn()}
        onMoveToTab={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /mover nota a otro espacio/i }));

    expect(onNoteSelect).not.toHaveBeenCalled();
  });

  it("opening the menu shows all available tabs EXCEPT the note's current tab", async () => {
    render(
      <NoteList
        notes={mockNotes} // both have tabId "t1" (Trabajo)
        tabs={tabsForMove}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveToTab={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: /mover nota a otro espacio/i })[0]);
    await act(async () => {});

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /personal/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /proyectos/i })).toBeInTheDocument();
    // Current tab "Trabajo" must NOT appear as an option.
    expect(within(dialog).queryByRole("button", { name: /^trabajo$/i })).not.toBeInTheDocument();
  });

  it("selecting a tab calls onMoveToTab(noteId, tabId) with the right args", async () => {
    const user = userEvent.setup();
    const onMoveToTab = vi.fn();
    render(
      <NoteList
        notes={mockNotes}
        tabs={tabsForMove}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveToTab={onMoveToTab}
      />
    );

    // Open the menu for the FIRST note (n1, tabId=t1)
    await user.click(screen.getAllByRole("button", { name: /mover nota a otro espacio/i })[0]);
    // Click "Personal" (t2) in the dialog
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /personal/i }));

    expect(onMoveToTab).toHaveBeenCalledWith("n1", "t2");
  });

  it("Escape closes the menu without calling onMoveToTab", async () => {
    const onMoveToTab = vi.fn();
    render(
      <NoteList
        notes={mockNotes}
        tabs={tabsForMove}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveToTab={onMoveToTab}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: /mover nota a otro espacio/i })[0]);
    await act(async () => {});

    const dialog = screen.getByRole("dialog");
    await act(async () => {
      dialog.dispatchEvent(
        new Event("cancel", { bubbles: true, cancelable: true })
      );
    });

    expect(onMoveToTab).not.toHaveBeenCalled();
  });

  // ── Keyboard-only flow (the whole point of issue #9) ───────────────────

  it("keyboard flow: focus trigger → Enter opens → ArrowDown → Enter selects → onMoveToTab called", async () => {
    const user = userEvent.setup();
    const onMoveToTab = vi.fn();
    render(
      <NoteList
        notes={mockNotes}
        tabs={tabsForMove}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        onMoveToTab={onMoveToTab}
      />
    );

    const trigger = screen.getAllByRole("button", { name: /mover nota a otro espacio/i })[0];
    trigger.focus();
    expect(trigger).toHaveFocus();

    // Enter opens the menu
    await user.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // The dialog should have moved focus to the first option (Personal, t2).
    const firstOption = within(dialog).getByRole("button", { name: /personal/i });
    expect(firstOption).toHaveFocus();

    // ArrowDown → next option (Proyectos, t3)
    await user.keyboard("{ArrowDown}");
    const secondOption = within(dialog).getByRole("button", { name: /proyectos/i });
    expect(secondOption).toHaveFocus();

    // Enter selects it
    await user.keyboard("{Enter}");
    expect(onMoveToTab).toHaveBeenCalledWith("n1", "t3");
  });
});

// ── enableDrag rename (cleanup fix #3) ────────────────────────────────────
//
// `onMoveNote` (which was a truthy flag never invoked) is replaced by an
// honest `enableDrag: boolean`. The drag handle's actual move logic stays
// in MainLayout.handleDragEnd (DndContext onDragEnd) — unchanged.

describe("NoteList — enableDrag rename", () => {
  it("renders a drag handle when enableDrag is true", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        enableDrag={true}
      />
    );

    expect(screen.getAllByTestId(/^note-handle-/)).toHaveLength(2);
  });

  it("does NOT render a drag handle when enableDrag is false", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        enableDrag={false}
      />
    );

    expect(screen.queryByTestId(/^note-handle-/)).not.toBeInTheDocument();
  });

  it("does NOT render a drag handle when enableDrag is omitted (defaults to falsy)", () => {
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

// ── Drag handle hidden under (hover: none) — REQ-LAY-03 ──────────────────────
//
// On touch-only devices the dnd-kit pickup affordance must NOT be visible
// AND must NOT capture pointer events. The handle uses CSS gating via a
// `.drag-handle` class + a media query in `index.css`. We assert both:
//   1. The rendered <button> carries the `.drag-handle` class so the CSS
//      rule can target it.
//   2. The CSS rule itself exists in `index.css` (jsdom doesn't compute
//      media queries; the contract is the source file).

describe("NoteList — drag handle touch affordance (REQ-LAY-03)", () => {
  // Read index.css from disk for the second assertion.
  // The NoteList.test.tsx already runs in node-types context (vitest
  // includes `types: ["node"]` in tsconfig).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");

  it("drag handle has the .drag-handle class so the CSS gate can target it", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        enableDrag={true}
      />
    );

    const handle = screen.getByTestId("note-handle-n1");
    expect(handle.className).toMatch(/\bdrag-handle\b/);
  });

  it("index.css declares a (hover: none) media query that hides .drag-handle", () => {
    const cssPath = path.resolve(__dirname, "../../index.css");
    const css = fs.readFileSync(cssPath, "utf-8");

    // The CSS rule must (a) target `.drag-handle`, (b) be inside a
    // `@media (hover: none)` block, and (c) hide it (display: none /
    // visibility: hidden) AND prevent it from swallowing touches
    // (pointer-events: none).
    const mediaBlock = css.match(
      /@media\s*\(\s*hover\s*:\s*none\s*\)\s*\{[\s\S]*?\}\s*\}/i
    );
    expect(mediaBlock, "missing @media (hover: none) block in index.css").not.toBeNull();

    const block = mediaBlock![0];
    expect(block).toMatch(/\.drag-handle\b/);
    expect(block).toMatch(/display\s*:\s*none/i);
    expect(block).toMatch(/pointer-events\s*:\s*none/i);
  });

  it("non-touch (mouse) devices still see the drag handle (no false positive)", () => {
    // This is the inverse of the touch-gate test. We don't mock matchMedia
    // here — jsdom's default matchMedia mock from test-setup.ts already
    // returns matches:false for any query, which is the (hover: hover)
    // desktop case. The handle must still render and carry .drag-handle.
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
        enableDrag={true}
      />
    );

    const handle = screen.getByTestId("note-handle-n1");
    expect(handle).toBeInTheDocument();
    expect(handle.className).toMatch(/\bdrag-handle\b/);
    // The handle must keep its base hover-affordance classes — the gate is
    // additive, not a replacement.
    expect(handle.className).toMatch(/\bgroup-hover:opacity-100\b/);
  });
});

// ── Mobile row density (REQ-LIST-02) ────────────────────────────────────────
//
// Spec: at ≤767px, each note row MUST render ≤56px of vertical space. The
// Tailwind `md:` variants are the gate — desktop at ≥768px reads the `md:*`
// overrides, mobile only sees the bare tokens. We assert the className
// tokens directly (jsdom doesn't compute media queries, but Tailwind 4
// emits the right CSS at build time; the contract is the source).

describe("NoteList — mobile row density (REQ-LIST-02)", () => {
  it("row button uses mobile-tight padding with md: desktop revert (px-3 py-2 md:px-4 md:py-3)", () => {
    render(
      <NoteList
        notes={mockNotes}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
      />,
    );

    const row = screen.getByTestId("note-row-n1");
    const classes = row.className;
    // Mobile default is tighter (py-2 = 8px vs py-3 = 12px).
    expect(classes).toMatch(/\bpx-3\b/);
    expect(classes).toMatch(/\bpy-2\b/);
    // Desktop ≥768px reverts to the original spacing via md: overrides.
    expect(classes).toMatch(/\bmd:px-4\b/);
    expect(classes).toMatch(/\bmd:py-3\b/);
  });

  it("preview line uses 1-line clamp on mobile with 2-line clamp on desktop (line-clamp-1 md:line-clamp-2)", () => {
    render(
      <NoteList notes={mockNotes} activeNoteId={null} onNoteSelect={vi.fn()} onCreateNote={vi.fn()} />,
    );

    const preview = screen.getByText(/detailed guide about hooks/i);
    const classes = preview.className;
    expect(classes).toMatch(/\bline-clamp-1\b/);
    expect(classes).toMatch(/\bmd:line-clamp-2\b/);
  });

  it("tab eyebrow chip is hidden on mobile, visible on desktop (md:hidden)", () => {
    render(
      <NoteList
        notes={mockNotes}
        tabs={mockTabs}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
      />,
    );

    const eyebrowWrap = screen.getByTestId("note-tab-eyebrow-wrap-n1");
    expect(eyebrowWrap.className).toMatch(/\bhidden\b/);
    expect(eyebrowWrap.className).toMatch(/\bmd:flex\b/);
  });

  it("tag chip row is hidden on mobile, visible on desktop (md:hidden)", () => {
    const notesWithTags: Note[] = [
      {
        ...mockNotes[0],
        tags: [
          { id: "tag-1", name: "react", userId: "u1", createdAt: "2024-01-01" },
          { id: "tag-2", name: "frontend", userId: "u1", createdAt: "2024-01-01" },
        ],
      },
    ];

    render(
      <NoteList
        notes={notesWithTags}
        activeNoteId={null}
        onNoteSelect={vi.fn()}
        onCreateNote={vi.fn()}
      />,
    );

    const tagRow = screen.getByTestId("note-tags-n1");
    expect(tagRow.className).toMatch(/\bhidden\b/);
    expect(tagRow.className).toMatch(/\bmd:flex\b/);
  });

  it("row mock geometry fits the ≤56px mobile contract via getBoundingClientRect", () => {
    const originalGetRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = vi.fn(function (this: Element) {
      if (
        this instanceof HTMLButtonElement &&
        this.hasAttribute("data-testid") &&
        this.getAttribute("data-testid")?.startsWith("note-row-")
      ) {
        return {
          width: 327,
          height: 56,
          top: 0,
          left: 0,
          right: 327,
          bottom: 56,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      }
      const fallback = originalGetRect.call(this);
      return fallback.width === 0 && fallback.height === 0
        ? { width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }
        : fallback;
    });

    try {
      render(
        <NoteList notes={mockNotes} activeNoteId={null} onNoteSelect={vi.fn()} onCreateNote={vi.fn()} />,
      );
      const row = screen.getByTestId("note-row-n1");
      const rect = row.getBoundingClientRect();
      expect(rect.height).toBeLessThanOrEqual(56);
    } finally {
      Element.prototype.getBoundingClientRect = originalGetRect;
    }
  });
});
