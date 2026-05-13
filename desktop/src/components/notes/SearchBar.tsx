import { useState, useEffect, useRef } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export function SearchBar({
  onSearch,
  debounceMs = 300,
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSearch(query: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(query);
    }, debounceMs);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setValue(q);
    scheduleSearch(q);
  }

  function handleClear() {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch("");
  }

  return (
    <div>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-text-secondary" aria-hidden="true">
          🔍
        </span>
        <input
          type="search"
          role="searchbox"
          value={value}
          onChange={handleChange}
          placeholder="Buscar en título y contenido..."
          className="w-full border-b-2 border-border bg-surface py-2.5 pl-9 pr-8 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:bg-surface-elevated focus:outline-none"
        />
        {value && (
          <button
            onClick={handleClear}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 text-text-secondary hover:text-text-primary"
          >
            ✕
          </button>
        )}
      </div>
      {value && (
        <p className="mt-1 px-2 text-[10px] text-text-secondary">
          Buscando en títulos y contenido de las notas
        </p>
      )}
    </div>
  );
}
