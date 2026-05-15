import type { Note } from "../../types";
import type { SortBy } from "../../stores/useNoteStore";
import { Select } from "../ui/Select";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "creation", label: "Fecha de creación" },
  { value: "modification", label: "Última modificación" },
  { value: "alphabetical", label: "Alfabético" },
];

interface NoteListProps {
  notes: Note[];
  activeNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  onCreateNote: () => void;
  onDeleteNote?: (noteId: string) => void;
  onToggleFavorite?: (noteId: string) => void;
  searchQuery?: string;
  sortBy?: SortBy;
  onSortChange?: (sortBy: SortBy) => void;
  isFavoriteOnly?: boolean;
  onFavoriteFilterToggle?: () => void;
}

export function NoteList({
  notes,
  activeNoteId,
  onNoteSelect,
  onCreateNote,
  onDeleteNote,
  onToggleFavorite,
  searchQuery = "",
  sortBy,
  onSortChange,
  isFavoriteOnly = false,
  onFavoriteFilterToggle,
}: NoteListProps) {
  const totalTags = notes.reduce((count, note) => count + (note.tags?.length ?? 0), 0);

  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-4 py-4">
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
            onClick={onCreateNote}
            aria-label="Nueva nota"
            className="grid h-9 w-9 place-items-center rounded-full bg-accent text-lg leading-none text-accent-text transition-colors hover:bg-accent-hover"
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

      <ul className="flex-1 overflow-y-auto p-2">
        {notes.length === 0 ? (
          <li className="m-2 border border-dashed border-border bg-surface-elevated/70 px-5 py-8 text-center text-sm text-text-secondary">
            {searchQuery ? (
              <>
                No se encontraron notas para{" "}
                <span className="font-medium text-text-primary">"{searchQuery}"</span>
                <p className="mt-2">
                  <button
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
            <li key={note.id} className="group relative mb-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => onNoteSelect(note.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNoteSelect(note.id); } }}
                aria-current={activeNoteId === note.id ? "true" : undefined}
                className={`w-full border px-4 py-3 text-left transition-colors cursor-pointer ${
                  activeNoteId === note.id
                    ? "border-accent border-2 bg-surface-elevated"
                    : "border-border bg-surface-elevated/75 hover:border-accent hover:bg-surface-elevated"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{note.title}</p>
                  {onToggleFavorite && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(note.id); }}
                      aria-label="Favorito"
                      aria-pressed={note.isFavorite ?? false}
                      className={`flex-shrink-0 text-sm leading-none transition-colors ${
                        note.isFavorite ? "text-accent" : "text-border hover:text-accent"
                      }`}
                    >
                      ★
                    </button>
                  )}
                </div>
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
              </div>
              {onDeleteNote && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                  aria-label="eliminar nota"
                  className="absolute bottom-3 right-3 hidden rounded-full px-2 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 hover:text-danger-hover group-hover:flex"
                >
                  ✕
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
