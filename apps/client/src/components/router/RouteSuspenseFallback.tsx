import type { CSSProperties } from "react";

/**
 * RouteSuspenseFallback (REQ-PERF-02)
 *
 * Shared fallback rendered inside <Suspense> while a lazy route chunk
 * is loading. Exposes a role="status" region for screen readers and a
 * configurable `minHeight` so the caller can match the route's
 * first-paint dimensions (zero CLS).
 *
 * Routes that paint above the fold (MainLayout, LoginPage) should pass
 * `minHeight="100vh"`. Other routes can rely on the 50vh default.
 */
export interface RouteSuspenseFallbackProps {
  minHeight?: string;
}

export function RouteSuspenseFallback({ minHeight = "50vh" }: RouteSuspenseFallbackProps) {
  const style: CSSProperties = {
    minHeight,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--fallback-bg, transparent)",
  };

  return (
    <div role="status" aria-live="polite" style={style} className="bg-surface">
      <div
        aria-hidden="true"
        className="h-3 w-12 overflow-hidden rounded-full bg-border"
      >
        <div className="h-full w-2/3 animate-pulse rounded-full bg-accent/60" />
      </div>
    </div>
  );
}
