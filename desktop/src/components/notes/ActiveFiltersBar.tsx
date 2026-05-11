import type { Tag } from "../../types";
import type { SortBy } from "../../stores/useNoteStore";

interface ActiveFiltersBarProps {
  resultCount: number;
  activeTabName: string | null;
  searchQuery: string;
  selectedTags: Tag[];
  isFavoriteOnly: boolean;
  sortBy: SortBy;
  onClearTab: () => void;
  onClearSearch: () => void;
  onRemoveTag: (tagId: string) => void;
  onClearFavorites: () => void;
  onClearAll: () => void;
}

const SORT_LABELS: Record<SortBy, string> = {
  creation: "Más reciente",
  modification: "Última modificación",
  alphabetical: "Alfabético",
};

export function ActiveFiltersBar({
  resultCount,
  activeTabName,
  searchQuery,
  selectedTags,
  isFavoriteOnly,
  sortBy,
  onClearTab,
  onClearSearch,
  onRemoveTag,
  onClearFavorites,
  onClearAll,
}: ActiveFiltersBarProps) {
  const hasFilters =
    !!activeTabName ||
    !!searchQuery ||
    selectedTags.length > 0 ||
    isFavoriteOnly;

  if (!hasFilters) {
    return (
      <div className="flex items-center justify-between border-border px-4 py-2">
        <span className="text-xs font-medium text-text-secondary">
          {resultCount} {resultCount === 1 ? "nota" : "notas"} · {SORT_LABELS[sortBy]}
        </span>
      </div>
    );
  }

  return (
    <div className="border-border space-y-2 px-4 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">
          {resultCount} {resultCount === 1 ? "nota" : "notas"} · {SORT_LABELS[sortBy]}
        </span>
        <button
          onClick={onClearAll}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Limpiar filtros
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Filtros activos">
        {activeTabName && (
          <FilterPill label={`Espacio: ${activeTabName}`} onRemove={onClearTab} />
        )}
        {searchQuery && (
          <FilterPill label={`"${searchQuery.length > 30 ? searchQuery.slice(0, 30) + "…" : searchQuery}"`} onRemove={onClearSearch} />
        )}
        {selectedTags.map((tag) => (
          <FilterPill key={tag.id} label={tag.name} onRemove={() => onRemoveTag(tag.id)} />
        ))}
        {isFavoriteOnly && (
          <FilterPill label="★ Solo favoritos" onRemove={onClearFavorites} />
        )}
      </div>
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      role="listitem"
      className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-text-primary"
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Eliminar filtro: ${label}`}
        className="ml-0.5 text-text-secondary hover:text-text-primary"
      >
        ✕
      </button>
    </span>
  );
}
