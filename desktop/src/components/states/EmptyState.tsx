/**
 * EmptyState (S1) — first launch, zero notes.
 *
 * Rendered by the list view when GET /api/notes returns an empty
 * array for an authenticated user. Copy follows the project Spanish
 * convention from the spec.
 */
interface EmptyStateProps {
  onCreate: () => void;
}

export function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <span aria-hidden="true" className="text-5xl leading-none opacity-70">
        📝
      </span>
      <div>
        <p className="text-base font-semibold text-text-primary">Aún no tienes notas</p>
        <p className="mt-1 text-sm text-text-secondary">
          Creá tu primera nota desde el escritorio para empezar.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
      >
        Crear desde desktop
      </button>
    </div>
  );
}