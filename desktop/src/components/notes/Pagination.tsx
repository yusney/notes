interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, totalCount, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalCount === 0 || totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  function handlePrev() {
    if (canPrev) onPageChange(page - 1);
  }

  function handleNext() {
    if (canNext) onPageChange(page + 1);
  }

  return (
    <div
      className="flex items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs"
      aria-label="Paginación"
    >
      <span className="text-text-secondary">
        Mostrando {start}-{end} de {totalCount} notas
      </span>
      <div className="flex items-center gap-1">
        <span className="text-text-secondary">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canPrev}
          aria-label="Anterior"
          className="rounded border border-border bg-surface-elevated px-2.5 py-1 font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:text-text-secondary disabled:hover:border-border disabled:hover:text-text-secondary"
        >
          ← Anterior
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          aria-label="Siguiente"
          className="rounded border border-border bg-surface-elevated px-2.5 py-1 font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:text-text-secondary disabled:hover:border-border disabled:hover:text-text-secondary"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}