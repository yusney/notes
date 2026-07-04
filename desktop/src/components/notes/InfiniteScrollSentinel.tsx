import { useEffect, useRef } from "react";

interface InfiniteScrollSentinelProps {
  /**
   * Called when the sentinel enters the viewport. The parent is expected to
   * be idempotent (the IO may re-fire under layout shifts) — typically by
   * guarding on `!isLoading && page < totalPages`.
   */
  onIntersect: () => void;
  /**
   * Disables the observer entirely. Use when the parent has no more data,
   * while loading (to avoid double-fetches), or when the feature is off
   * (e.g. desktop renders explicit pagination instead).
   */
  enabled: boolean;
  /**
   * IntersectionObserver root. Defaults to `null` (the viewport). Pass a
   * scrollable container ref to observe against a nested scroller.
   */
  root?: Element | null;
  /**
   * Margin around the root. `"100px"` triggers ~one viewport early so
   * the next page starts loading before the user actually reaches the
   * bottom. Defaults to "100px".
   */
  rootMargin?: string;
}

/**
 * Invisible sentinel mounted as the last <li> in the note list. When the
 * sentinel enters the viewport, the parent's `onIntersect` fires. Mobile
 * only — desktop uses the explicit <Pagination> control.
 *
 * Why a separate component: encapsulates the IntersectionObserver
 * lifecycle, supports JSDOM tests via the `IntersectionObserver` polyfill
 * (vitest setup), and keeps NoteList readable.
 */
export function InfiniteScrollSentinel({
  onIntersect,
  enabled,
  root,
  rootMargin = "100px",
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Hold the latest callback in a ref so the IO subscription doesn't need
  // to be torn down + recreated when the parent passes a new closure.
  const onIntersectRef = useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onIntersectRef.current();
            return;
          }
        }
      },
      { root: root ?? null, rootMargin, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, root, rootMargin]);

  return (
    <div
      ref={ref}
      data-testid="infinite-scroll-sentinel"
      aria-hidden="true"
      className="h-1 w-full"
    />
  );
}
