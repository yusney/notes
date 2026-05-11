import type { Tag } from "../../types";

interface TagFilterProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
}

export function TagFilter({ tags, selectedTagIds, onChange }: TagFilterProps) {
  if (tags.length === 0) return null;

  const toggle = (id: string) => {
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((t) => t !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  };

  return (
    <div role="group" aria-label="Filtrar por etiquetas">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-secondary">
          Tags
        </span>
        {selectedTagIds.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-[10px] font-medium text-accent hover:text-accent-hover"
          >
            Limpiar
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const isActive = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggle(tag.id)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "border-accent bg-accent-subtle text-text-primary"
                  : "border-border bg-surface-elevated text-text-secondary hover:border-accent/50 hover:text-text-primary"
              }`}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
