import type { Note, Tab } from "../../types";
import type { SortBy } from "../../stores/useNoteStore";
import { useDraggable } from "@dnd-kit/core";
import { Select } from "../ui/Select";
import { Pagination } from "./Pagination";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "creation", label: "Fecha de creación" },
  { value: "modification", label: "Última modificación" },
  { value: "alphabetical", label: "Alfabético" },
];

/**
 * Module-scope empty array used as the default for the optional `tabs` prop.
 * Returning a fresh `[]` every render breaks memoization in downstream
 * children (e.g. NoteRow), so we hoist a single constant instead.
 */
const EMPTY_TABS: Tab[] = [];

interface NoteListProps {
  notes: Note[];
  /**
   * Available tabs — used to render the tab badge eyebrow on each note row.
   * If a note's `tabId` isn't found in this list, the eyebrow is omitted.
   */
  tabs?: Tab[];
  activeNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  onCreateNote: () => void;
  onDeleteNote?: (noteId: string) => void;
  onToggleFavorite?: (noteId: string) => void;
  onMoveNote?: (noteId: string) => void;
  searchQuery?: string;
  sortBy?: SortBy;
  onSortChange?: (sortBy: SortBy) => void;
  isFavoriteOnly?: boolean;
  onFavoriteFilterToggle?: () => void;
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
  };
}

export function NoteList({
  notes,
  tabs = EMPTY_TABS,
  activeNoteId,
  onNoteSelect,
  onCreateNote,
  onDeleteNote,
  onToggleFavorite,
  onMoveNote,
  searchQuery = "",
  sortBy,
  onSortChange,
  isFavoriteOnly = false,
  onFavoriteFilterToggle,
  pagination,
}: NoteListProps) {
  const totalTags = notes.reduce((count, note) => count + (note.tags?.length ?? 0), 0);

  return (
    <div className="flex min-h-0 flex-1 w-80 flex-col border-r border-border bg-surface">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-text-secondary">Notas</span>
            <p className="mt-1 text-sm text-text-secondary">
              {notes.length} {notes.length === 1 ? "nota" : "notas"} · {totalTags} tags
            </p>
          </div>
        <div className="flex items-center gap-2">
          {onFavoriteFilterToggle && (
            <button
              type="button"
              onClick={onFavoriteFilterToggle}
              aria-label="Solo favoritos"
              aria-pressed={isFavoriteOnly}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isFavoriteOnly
                  ? "border-accent bg-accent-subtle text-text-primary"
                  : "border-border bg-surface-elevated text-text-secondary hover:border-accent hover:text-accent"
              }`}
            >
              ★
            </button>
          )}
          <button
            type="button"
            onClick={onCreateNote}
            aria-label="Nueva nota"
            className="grid size-9 place-items-center rounded-full bg-accent text-lg leading-none text-accent-text transition-colors hover:bg-accent-hover"
          >
            +
          </button>
        </div>
        </div>
      </div>

      {(onSortChange || sortBy) && (
        <div className="border-b border-border px-4 py-3">
          <Select
            options={SORT_OPTIONS}
            value={sortBy ?? "creation"}
            onChange={(v) => onSortChange?.(v as SortBy)}
            ariaLabel="Ordenar por"
          />
        </div>
      )}

      <ul className="flex-1 min-h-0 overflow-y-auto p-2">
        {notes.length === 0 ? (
          <li className="m-2 border border-dashed border-border bg-surface-elevated/70 px-5 py-8 text-center text-sm text-text-secondary">
            {searchQuery ? (
              <>
                No se encontraron notas para{" "}
                <span className="font-medium text-text-primary">"{searchQuery}"</span>
                <p className="mt-2">
                  <button
                    type="button"
                    onClick={onCreateNote}
                    className="font-medium text-accent hover:text-accent-hover"
                  >
                    Crear una nota nueva
                  </button>
                </p>
              </>
            ) : (
              <>
                <p>Crea tu primera nota</p>
                <button
                  type="button"
                  onClick={onCreateNote}
                  className="mt-3 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-text transition-colors hover:bg-accent-hover"
                >
                  Nueva nota
                </button>
              </>
            )}
          </li>
        ) : (
          notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              tabs={tabs}
              activeNoteId={activeNoteId}
              onNoteSelect={onNoteSelect}
              onDeleteNote={onDeleteNote}
              onToggleFavorite={onToggleFavorite}
              onMoveNote={onMoveNote}
            />
          ))
        )}
      </ul>
      {pagination && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}

interface NoteRowProps {
  note: Note;
  /**
   * Available tabs — used to resolve the note's tab name for the eyebrow.
   * If the note's `tabId` isn't found, the eyebrow is omitted.
   */
  tabs?: Tab[];
  activeNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onToggleFavorite?: (noteId: string) => void;
  onMoveNote?: (noteId: string) => void;
}

/**
 * Tiny folder/segment glyph used as a subtle prefix for the tab eyebrow.
 * Inline SVG keeps it crisp at any size and avoids pulling in an icon dep.
 */
const FOLDER_GLYPH = (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    width="10"
    height="10"
    fill="currentColor"
    className="shrink-0 opacity-70"
  >
    <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.379a1.5 1.5 0 0 1 1.06.44l.94.94a.5.5 0 0 0 .353.146H12.5A1.5 1.5 0 0 1 14 6.026V11.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5z" />
  </svg>
);

/**
 * One note row in the list. Extracted so it can use the useDraggable hook
 * (hooks can't be called conditionally per-note inside the parent's loop).
 *
 * Layout: <li> is a flex row with these children, ALL siblings of each other —
 *   1. Drag handle (own gutter column on the left, flex sibling of the card)
 *   2. Select <button> (the card filling the remaining width, the main click target)
 *   3. Favorite star <button> (absolute top-right, sibling of the select button)
 *   4. Delete <button> (absolute bottom-right, sibling of the select button)
 *
 * None of these buttons may be NESTED inside another — a <button> inside a
 * <button> is invalid HTML and breaks semantics. All interactive buttons
 * (handle, favorite, delete) live as siblings of the select <button>.
 */
function NoteRow({
  note,
  tabs = EMPTY_TABS,
  activeNoteId,
  onNoteSelect,
  onDeleteNote,
  onToggleFavorite,
  onMoveNote,
}: NoteRowProps) {
  const draggable = useDraggable({ id: note.id, disabled: !onMoveNote });

  // Resolve tab name once per render. If the tab isn't loaded yet, omit the eyebrow.
  const tabName = tabs.find((t) => t.id === note.tabId)?.name ?? null;

  // Style: when drag is active, dim opacity so user can see what they picked up.
  const style = draggable.isDragging
    ? { opacity: 0.4, cursor: "grabbing" }
    : undefined;

  return (
    <li
      ref={draggable.setNodeRef}
      className="group relative mb-2 flex items-stretch gap-1"
      style={style}
    >
      {onMoveNote && (
        // SIBLING of the select button. Sits in its own left gutter column —
        // not absolutely positioned over the card. stopPropagation isolates
        // pointer/keyboard events so the parent <button> doesn't fire onNoteSelect.
        <button
          ref={draggable.setActivatorNodeRef}
          type="button"
          data-testid={`note-handle-${note.id}`}
          aria-label="Arrastrar nota"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          // @dnd-kit drag listeners attached here so only the handle starts the drag.
          {...draggable.listeners}
          {...draggable.attributes}
          className="flex w-5 flex-shrink-0 cursor-grab items-center justify-center self-center rounded text-text-secondary/60 opacity-0 transition-opacity hover:text-accent focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent group-hover:opacity-100"
        >
          {/* 2x3 dot grid — refined grab affordance, replaces the old "⋮⋮" glyph */}
          <span aria-hidden="true" className="grid grid-cols-2 gap-[3px]">
            <span className="block size-[3px] rounded-full bg-current" />
            <span className="block size-[3px] rounded-full bg-current" />
            <span className="block size-[3px] rounded-full bg-current" />
            <span className="block size-[3px] rounded-full bg-current" />
            <span className="block size-[3px] rounded-full bg-current" />
            <span className="block size-[3px] rounded-full bg-current" />
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={() => onNoteSelect(note.id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNoteSelect(note.id); } }}
        aria-current={activeNoteId === note.id ? "true" : undefined}
        className={`min-w-0 flex-1 border px-4 py-3 text-left transition-colors cursor-pointer ${
          activeNoteId === note.id
            ? "border-accent border-2 bg-surface-elevated"
            : "border-border bg-surface-elevated/75 hover:border-accent hover:bg-surface-elevated"
        }`}
      >
        {tabName && (
          <div className="mb-1.5 flex">
            <span
              data-testid={`note-tab-eyebrow-${note.id}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent-subtle px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wider text-text-secondary"
            >
              {FOLDER_GLYPH}
              <span className="truncate">{tabName}</span>
            </span>
          </div>
        )}
        <p className={`min-w-0 truncate text-sm font-semibold text-text-primary ${onToggleFavorite ? "pr-7" : ""}`}>{note.title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
          {note.content.replace(/<[^>]*>/g, " ").slice(0, 90) || "Sin contenido todavía"}
        </p>
        {note.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="rounded-full bg-accent-subtle px-2 py-0.5 text-xs text-text-secondary">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </button>

      {onToggleFavorite && (
        // SIBLING of the select button (mirrors the drag handle and delete buttons).
        // Positioned absolute top-right of the <li> so it stays visually anchored
        // to the title row without nesting another <button> inside the select <button>
        // (invalid HTML — the browser would close the outer button early, breaking
        // clicks, focus, and screen readers).
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(note.id); }}
          aria-label="Favorito"
          aria-pressed={note.isFavorite ?? false}
          className={`absolute top-2 right-2 z-10 size-6 grid place-items-center text-base leading-none transition-colors ${
            note.isFavorite ? "text-accent" : "text-border hover:text-accent"
          }`}
        >
          ★
        </button>
      )}

      {onDeleteNote && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
          aria-label="eliminar nota"
          className="absolute bottom-2 right-2 hidden rounded-full px-2 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 hover:text-danger-hover group-hover:flex"
        >
          ✕
        </button>
      )}
    </li>
  );
}
