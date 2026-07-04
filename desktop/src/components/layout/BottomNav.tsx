import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

export interface BottomNavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

/**
 * The 4-item mobile nav declared at module scope so other components
 * (PR2 `MobileShell`, deep-link handlers, future QA scripts) can
 * iterate the same set without re-declaring the configuration.
 *
 * Order is part of the contract — Material 3 / iOS HIG place the
 * primary CTA at index 3 of 4, so users develop cross-platform
 * muscle memory. Changing order is a breaking change.
 *
 * Visual: "Nueva" uses a FLAT solid '+' glyph (no filled background),
 * locked decision from #2207. The old floating "+" / FAB was removed
 * in favour of this tab; cf. REQ-LAY-02.
 */
export const BOTTOM_NAV_ITEMS: readonly BottomNavItem[] = [
  { label: "Notas", path: "/", icon: <span aria-hidden="true">📝</span> },
  { label: "Buscar", path: "/search", icon: <span aria-hidden="true">🔍</span> },
  {
    label: "Nueva",
    path: "/new",
    icon: <span data-testid="bottom-nav-icon-nueva" aria-hidden="true">+</span>,
  },
  { label: "Perfil", path: "/profile", icon: <span aria-hidden="true">👤</span> },
] as const;

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
            className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-2 py-1 text-text-caption transition-colors ${
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
