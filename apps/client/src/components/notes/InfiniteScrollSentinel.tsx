import { useEffect, useRef, type RefObject } from "react";

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
   * Ref to a scrollable container that owns the scroll. The IO observes
   * against THIS element instead of the viewport. The parent MUST pass
   * the same ref attached to the <ul>/<div> that has `overflow-y-auto`.
   *
   * Why this matters: the <ul> has its own scroll context (overflow-y-auto).
   * With `root: null` the IO watches the viewport, which never intersects
   * the sentinel once the list is taller than the screen — so the user
   * could scroll inside the list forever without the IO firing. Passing
   * the scrollable container as root makes the IO fire when the sentinel
   * enters the CONTAINER's viewport, not the browser's.
   */
  rootRef?: RefObject<Element | null>;
  /**
   * Margin around the root. `"100px"` triggers ~one viewport early so
   * the next page starts loading before the user actually reaches the
   * bottom. Defaults to "100px".
   */
  rootMargin?: string;
}

/**
 * Invisible sentinel mounted as the last <li> in the note list. When the
 * sentinel enters the root scroll container, the parent's onIntersect
 * fires. Mobile only — desktop uses the explicit <Pagination> control.
 *
 * The root MUST be the scrollable container (the <ul> with overflow-y-auto),
 * not the browser viewport. See `rootRef` for the rationale.
 */
export function InfiniteScrollSentinel({
  onIntersect,
  enabled,
  rootRef,
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
    const root = rootRef?.current ?? null;
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
      { root, rootMargin, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // rootRef.current is read inside but the ref object itself is stable;
    // the parent doesn't recreate the ref. So we don't include it in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rootMargin, rootRef]);

  return (
    <div
      ref={ref}
      data-testid="infinite-scroll-sentinel"
      aria-hidden="true"
      className="h-1 w-full"
    />
  );
}
