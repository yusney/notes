/**
 * BottomNav items — extracted from BottomNav.tsx so the component file
 * can be fast-refreshed (Vite/React Fast Refresh requires component
 * files to export only React components; see
 * react-doctor/only-export-components). Tests and other consumers import
 * the items from here.
 */
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
