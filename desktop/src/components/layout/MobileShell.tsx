import { useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppBar } from "./AppBar";
import { BottomNav } from "./BottomNav";
import { SideSheet } from "./SideSheet";
import { EspaciosSection } from "./EspaciosSection";
import { useNoteStore } from "../../stores/useNoteStore";

/**
 * Mobile shell — single-column mobile-only chrome that wraps react-router's
 * `<Outlet/>` with the AppBar (top), BottomNav (bottom) and a SideSheet
 * drawer opened from a hamburger trigger.
 *
 * Mount: caller (`MainLayout`) places this inside a `md:hidden` sibling
 * so the mobile shell only renders at <768px. MobileShell itself is
 * mount-agnostic — its visibility is decided by the parent.
 *
 * Mobile-only behaviours encoded here:
 *   1. **Hamburger vs. back chevron** — `/` shows a hamburger (opens
 *      SideSheet); every other route shows a back chevron that calls
 *      `navigate(-1)`.
 *   2. **Auto-close on route change** — any `pathname` change forces the
 *      SideSheet closed so navigation + drawer state never go out of
 *      sync.
 *   3. **Store override** — the desktop list↔main split-view is driven
 *      by `useNoteStore.activeNoteId`. On non-home mobile routes we
 *      clear that field so the desktop `<main>` block doesn't fight the
 *      mobile `<Outlet/>`. The reset happens via `useNoteStore.setState`
 *      inside an effect keyed on `pathname`, NOT on `activeNoteId` —
 *      that prevents an infinite loop where clearing triggers a
 *      re-render that re-clears.
 *   4. **Title derivation** — AppBar shows a route-aware title (Notas,
 *      Buscar, Nueva nota, Perfil, Configuración). The `/notes/:id`
 *      route intentionally returns an empty title because the
 *      NoteViewer header below the AppBar already displays the
 *      actual note title — duplicating it as a generic "Nota" was
 *      redundant vertical space on a thumb-driven viewport. This
 *      keeps the shell mount-agnostic while still giving the user
 *      context about which screen they are on.
 *
 * REQ-LAY-01 (desktop-pixel-identical): this component is added as a
 * `md:hidden` sibling of the existing flex tree in `MainLayout`; the
 * desktop markup (`md:flex-row`, `md:flex`, etc.) is untouched.
 */

// Routes that should show the hamburger menu. Note detail routes keep
// the back chevron because they are a drill-down surface; the rest of
// the mobile app stays on the menu-first navigation pattern.
function shouldShowMenu(pathname: string): boolean {
  return pathname === "/" || pathname === "/search" || pathname === "/new" || pathname === "/profile" || pathname === "/settings";
}

// Route → AppBar title. Kept as a pure helper for easy unit-testing.
//
// `/notes/:id` deliberately returns "" — the NoteViewer header below
// the AppBar already shows the actual note title, so duplicating it as
// a generic "Nota" in the AppBar is redundant vertical space that
// pushes the empty / content area down on a thumb-driven viewport.
// The AppBar still renders the leading slot (back chevron) so the
// user has a clear way out.
function getMobileTitle(pathname: string): string {
  if (pathname === "/") return "Notas";
  if (pathname === "/new") return "Nueva nota";
  if (pathname === "/search") return "Buscar";
  if (pathname === "/profile") return "Perfil";
  if (pathname === "/settings") return "Configuración";
  if (pathname.startsWith("/notes/")) return "";
  return "";
}

export interface MobileShellProps {
  /**
   * Optional children to render in the main slot. When omitted, the
   * shell renders react-router's `<Outlet/>` so the shell can also be
   * used as a layout route (`<Route element={<MobileShell />}>`).
   *
   * Both modes share the same chrome (AppBar + main + BottomNav +
   * SideSheet) — the slot is just where the page content lives.
   */
  children?: ReactNode;
}

export function MobileShell({ children }: MobileShellProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Auto-close the drawer on any URL change. The URL is the source of
  // truth for "where am I" — keeping the sheet open across navigation
  // would feel like the drawer is sticky and broken.
  //
  // The react-doctor `no-mutable-in-deps` rule flags `location.pathname`
  // as a mutable global — false positive. `useLocation()` (line 82)
  // already subscribes the component to location changes; the effect
  // re-runs whenever the component re-renders due to a route change.
  // eslint-disable-next-line react-doctor/no-mutable-in-deps
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  // Mobile/desktop branch coexistence: the desktop split-view uses the
  // store's `activeNoteId` to decide whether to render the list or the
  // viewer. On mobile we don't want that signal — the route IS the
  // source of truth. Resetting on every non-home route keeps the
  // desktop <main> hidden so the mobile <Outlet> owns the viewport.
  // eslint-disable-next-line react-doctor/no-mutable-in-deps
  useEffect(() => {
    if (location.pathname !== "/") {
      useNoteStore.setState({ activeNoteId: null });
    }
  }, [location.pathname]);

  const showMenu = shouldShowMenu(location.pathname);
  const title = getMobileTitle(location.pathname);

  function handleBack() {
    if (location.pathname.startsWith("/notes/")) {
      navigate("/", { replace: true });
      return;
    }
    navigate(-1);
  }

  const leading = showMenu ? (
    <button
      type="button"
      data-testid="mobile-menu-button"
      aria-label="Menú"
      onClick={() => setSheetOpen(true)}
      className="grid size-11 place-items-center rounded text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span aria-hidden="true" className="text-2xl leading-none">≡</span>
    </button>
  ) : (
    <button
      type="button"
      data-testid="mobile-back-button"
      aria-label="Volver"
      onClick={handleBack}
      className="grid size-11 place-items-center rounded text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span aria-hidden="true" className="text-2xl leading-none">←</span>
    </button>
  );

  return (
    <div
      data-testid="mobile-shell"
      className="md:hidden flex h-screen flex-col bg-surface text-text-primary"
    >
      <AppBar title={title} leading={leading} />
      <main className="flex min-h-0 flex-1 overflow-hidden">
        {children !== undefined ? children : <Outlet />}
      </main>
      <BottomNav />
      <SideSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        header={<EspaciosSection onClose={() => setSheetOpen(false)} />}
      />
    </div>
  );
}
