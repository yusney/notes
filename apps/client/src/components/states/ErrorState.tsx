/**
 * ErrorState (S2) — first launch, API error (5xx).
 *
 * Rendered by the list view when GET /api/notes returns a 5xx.
 * Copy follows the project Spanish convention from the spec.
 * Uses role="alert" so screen readers announce the failure.
 */
interface ErrorStateProps {
  onRetry: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-testid="error-state"
      className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <span aria-hidden="true" className="text-5xl leading-none opacity-70">
        ⚠️
      </span>
      <div>
        <p className="text-base font-semibold text-danger">No pudimos cargar tus notas</p>
        <p className="mt-1 text-sm text-text-secondary">
          Reintentá en unos segundos. Si el problema persiste, tu sesión sigue activa.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-accent bg-accent-subtle px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-text"
      >
        Reintentar
      </button>
    </div>
  );
}