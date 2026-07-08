import { useState, useEffect, useRef } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
  variant?: "page" | "appbar";
}

export function SearchBar({
  onSearch,
  debounceMs = 300,
  variant = "page",
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAppBar = variant === "appbar";

  function scheduleSearch(query: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(query);
    }, debounceMs);
  }

  useEffect(() => {
    return () => {
      // Read timerRef.current at UNMOUNT time, not at mount time.
      // The old code captured `timerRef.current` into a const at mount
      // (always null on first effect run) and cleared that stale
      // snapshot — so a pending debounce scheduled after mount fired
      // `onSearch(query)` after the component was gone.
      //
      // The react-doctor `exhaustive-deps` rule (false positive) suggests
      // the old "copy ref to const" antipattern. Refs are intentionally
      // read at use-time, not captured in the closure, so we ignore it
      // here on purpose.
      // eslint-disable-next-line react-doctor/exhaustive-deps
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function onQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    <div className={isAppBar ? "w-full" : undefined}>
      <div className="relative flex items-center">
        <span
          className={`absolute text-text-secondary ${isAppBar ? "left-2.5 text-sm" : "left-3"}`}
          aria-hidden="true"
        >
          🔍
        </span>
        <input
          type="search"
          name="note-search"
          autoComplete="off"
          aria-label="Buscar notas"
          value={value}
          onChange={onQueryChange}
          placeholder={isAppBar ? "Buscar notas…" : "Buscar en título y contenido…"}
          className={
            isAppBar
              ? "h-11 w-full rounded border border-border bg-surface px-9 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:bg-surface-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              : "w-full border-b-2 border-input-border bg-surface py-2.5 pl-9 pr-8 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:bg-surface-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          }
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 grid size-8 place-items-center text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ✕
          </button>
        )}
      </div>
      {!isAppBar && value && (
        <p className="mt-1 px-2 text-[10px] text-text-secondary">
          Buscando en títulos y contenido de las notas
        </p>
      )}
    </div>
  );
}
