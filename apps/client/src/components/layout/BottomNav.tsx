import { Link, useLocation } from "react-router-dom";
import { BOTTOM_NAV_ITEMS } from "./BottomNav.items";

/**
 * BottomNav — 4-tab mobile bottom navigation for shell-redesign-v1.
 *
 * Mount: always; the caller (PR2 `MobileShell`) places it inside
 * `md:hidden` so the tab bar only renders on mobile widths.
 *
 * Active item: detected by exact `pathname === item.path` match. Detail
 * routes like `/notes/:id` deliberately activate nothing — that view
 * owns the screen and the tab bar acts as a way *out*, not as a hub.
 *
 * Safe-area: `pb-[var(--safe-bottom)]` lifts the bar above the OS
 * gesture bar on devices that report `viewport-fit=cover`.
 *
 * Touch targets: each `<Link>` has `min-h-11 min-w-11` (44×44 px) per
 * the Apple HIG / Material 3 minimum.
 */
export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-border bg-surface-elevated pb-[var(--safe-bottom)] text-text-secondary"
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-2 py-1 text-[length:var(--type-caption)] transition-colors ${
              isActive ? "text-accent" : "hover:text-text-primary"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
