import { useEffect, useState } from "react";

const MOBILE_MAX_PX = 767;

/**
 * Shared mobile breakpoint hook.
 *
 * Keeps the viewport test in one place so mobile pages can share the
 * same layout decision without duplicating matchMedia boilerplate.
 */
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  return isMobile;
}
