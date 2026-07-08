interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  /**
   * When true, switches the container to a vertical stack on viewports
   * ≤767px and makes the nav buttons full-width so the control doesn't
   * overflow on 360px-class screens (REQ-LAY-05). At ≥768px both modes use
   * the same horizontal layout — opt-in is additive, never replacing the
   * desktop contract. Default: false (byte-identical to pre-change).
   */
  mobileLayout?: boolean;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  mobileLayout = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Hide only when there are no notes at all. With a single page we still
  // render the info bar ("Mostrando X de Y · Página 1 de 1") with both nav
  // buttons disabled, so the user always sees count feedback.
  if (totalCount === 0) return null;

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

  // Container layout: when `mobileLayout` is on, stack vertically on mobile
  // and revert to horizontal at ≥768px. When off (default), the container
  // uses the unchanged horizontal layout — keeping the desktop byte-identical
  // invariant (REQ-LAY-01).
  const containerClass = mobileLayout
    ? "flex flex-col items-stretch gap-2 border-t border-border px-4 py-2 text-xs md:flex-row md:items-center md:justify-between"
    : "flex items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs";

  // Buttons: full-width on mobile when mobileLayout is on, auto width on
  // desktop in both modes (so the desktop contract is byte-identical).
  const buttonBaseClass = "rounded border border-border bg-surface-elevated px-2.5 py-1 font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:text-text-secondary disabled:hover:border-border disabled:hover:text-text-secondary";
  const buttonClass = mobileLayout
    ? `${buttonBaseClass} w-full md:w-auto`
    : buttonBaseClass;

  return (
    <div className={containerClass} aria-label="Paginación">
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
          className={buttonClass}
        >
          ← Anterior
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          aria-label="Siguiente"
          className={buttonClass}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}