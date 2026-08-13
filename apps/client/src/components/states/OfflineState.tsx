/**
 * OfflineState (S3) — device is offline (airplane mode).
 *
 * Rendered by the list view when `navigator.onLine === false`.
 * The data layer MUST NOT call /api/notes when this state is active
 * (the spec explicitly says "SHALL NOT call /api/notes"). The banner
 * is a polite live region so screen readers announce the state
 * without interrupting other narration.
 *
 * Copy follows the project Spanish convention from the spec.
 */
export function OfflineState() {
  return (
    <div
      role="status"
      data-testid="offline-state"
      className="flex items-center gap-2 border-b border-accent bg-accent-subtle px-4 py-2 text-sm text-text-primary"
    >
      <span aria-hidden="true" className="text-base leading-none">📶</span>
      <p className="font-medium">Sin conexión</p>
      <p className="text-text-secondary">— reintentaremos cuando vuelvas a tener señal.</p>
    </div>
  );
}