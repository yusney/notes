/* eslint-disable react-doctor/prefer-tag-over-role -- div[role=group] is correct; <fieldset> is semantically wrong for a filter list */
import { useState } from "react";
import { Modal } from "../ui/Modal";
import type { Tag } from "../../types";

interface TagFilterProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Tag filter for the workspace sidebar.
 *
 * Selected tags render as removable chips; a "Filtrar" button opens a modal
 * with a searchable checkbox list so the section stays compact even with
 * dozens of tags. Selection is live (onChange fires on every toggle).
 */
export function TagFilter({ tags, selectedTagIds, onChange }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  if (tags.length === 0) return null;

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const query = search.trim().toLowerCase();
  const visibleTags = query
    ? tags.filter((t) => t.name.toLowerCase().includes(query))
    : tags;

  const toggle = (id: string) => {
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((t) => t !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  };

  const removeTag = (id: string) => onChange(selectedTagIds.filter((t) => t !== id));
  const clearAll = () => onChange([]);

  const close = () => {
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div role="group" aria-label="Filtrar por etiquetas">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-secondary">
          Etiquetas
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-[10px] font-medium text-accent hover:text-accent-hover"
        >
          Filtrar{selectedTags.length > 0 ? ` (${selectedTags.length})` : ""}
        </button>
      </div>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => removeTag(tag.id)}
              aria-label={`Quitar ${tag.name}`}
              className="border border-accent bg-accent-subtle px-2.5 py-1 font-mono text-xs uppercase text-text-primary transition-colors hover:bg-accent/20"
            >
              {tag.name} ✕
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] font-medium text-text-secondary hover:text-text-primary"
          >
            Limpiar
          </button>
        </div>
      )}

      <Modal open={isOpen} onClose={close} title="Filtrar por etiquetas">
        <div className="flex flex-col gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar etiqueta…"
            className="w-full border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-accent"
            aria-label="Buscar etiqueta"
          />
          <div className="max-h-60 overflow-y-auto flex flex-col gap-1">
            {visibleTags.length === 0 ? (
              <p className="py-2 text-xs text-text-secondary">Sin coincidencias.</p>
            ) : (
              visibleTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-text-primary hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(tag.id)}
                      aria-label={tag.name}
                      className="accent-accent"
                    />
                    <span className="font-mono text-xs uppercase">{tag.name}</span>
                  </label>
                );
              })
            )}
          </div>
          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={clearAll}
              disabled={selectedTagIds.length === 0}
              className="text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-40"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={close}
              className="bg-accent px-4 py-2 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
