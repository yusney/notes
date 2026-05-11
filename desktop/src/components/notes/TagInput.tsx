import { useState } from "react";
import type { Tag } from "../../types";

interface TagInputProps {
  availableTags: Tag[];
  selectedTagNames: string[];
  onChange: (names: string[]) => void;
}

export function TagInput({ availableTags, selectedTagNames, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const name = inputValue.trim().toLowerCase();
      if (!name || selectedTagNames.includes(name)) return;
      onChange([...selectedTagNames, name]);
      setInputValue("");
    }
  };

  const removeTag = (name: string) => {
    onChange(selectedTagNames.filter((t) => t !== name));
  };

  return (
    <div className="space-y-2">
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        {selectedTagNames.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full border border-accent-subtle bg-accent-subtle px-2.5 py-1 text-xs font-medium text-text-primary"
          >
            {name}
            <button
              type="button"
              aria-label={`Eliminar etiqueta ${name}`}
              onClick={() => removeTag(name)}
              className="text-accent hover:text-text-primary"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        list="available-tags"
        type="text"
        placeholder="Agregar etiqueta y presionar Enter..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
      <datalist id="available-tags">
        {availableTags.map((tag) => (
          <option key={tag.id} value={tag.name} />
        ))}
      </datalist>
    </div>
  );
}
