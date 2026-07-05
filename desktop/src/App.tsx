import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./components/auth/AuthProvider";
import { RouteSuspenseFallback } from "./components/router/RouteSuspenseFallback";
import { RouteErrorBoundary } from "./components/router/RouteErrorBoundary";
import { useTheme } from "./hooks/useTheme";
import { CloseDialog } from "./components/CloseDialog";

// REQ-PERF-02 — every page is loaded via React.lazy() so its module +
// heavy deps (TipTap on editor routes, etc.) land in a separate chunk
// instead of the main entry. Each lazy() needs `{ default: ... }` since
// pages are named-exported.
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage }))
);
const MainLayout = lazy(() =>
  import("./pages/MainLayout").then((m) => ({ default: m.MainLayout }))
);
const SharedNotePage = lazy(() =>
  import("./pages/SharedNotePage").then((m) => ({ default: m.SharedNotePage }))
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const MobileNotePage = lazy(() =>
  import("./pages/MobileNotePage").then((m) => ({ default: m.MobileNotePage }))
);
const NewNotePage = lazy(() =>
  import("./pages/NewNotePage").then((m) => ({ default: m.NewNotePage }))
);
const MobileSearchPage = lazy(() =>
  import("./pages/MobileSearchPage").then((m) => ({ default: m.MobileSearchPage }))
);
const MobileHomePage = lazy(() =>
  import("./pages/MobileHomePage").then((m) => ({ default: m.MobileHomePage }))
);
const MobileShell = lazy(() =>
  import("./components/layout/MobileShell").then((m) => ({ default: m.MobileShell }))
);

function ThemeWatcher() {
  // Mount useTheme to trigger initial theme application via applyThemeToDocument in useTheme.ts
  useTheme();
  return null;
}

/**
 * Wrap a route element with the shared Suspense fallback (to handle
 * the brief chunk-load window) and the per-route error boundary (to
 * surface chunk-load failures with a retry button — without replacing
 * the global app shell).
 */
function lazyRoute(element: React.ReactNode, minHeight?: string) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteSuspenseFallback minHeight={minHeight} />}>
        {element}
      </Suspense>
    </RouteErrorBoundary>
  );
}

/**
 * AppRoutes — the inner route tree shared between the production
 * `<App/>` wrapper and unit tests. Extracted so tests can mount the
 * tree under `<MemoryRouter>` without nesting two Routers.
 *
 * PR2 routes added (mobile drill-down, decision #2/#3):
 *   - `/notes/:id` — MobileNotePage (read-only viewer on mobile)
 *   - `/new`       — NewNotePage (stub: createNote + redirect)
 *   - `/search`    — MobileSearchPage (full-screen search)
 *
 * The mobile shell (AppBar + Outlet + BottomNav + SideSheet) lives
 * inside `MainLayout` — the route pages render their content there
 * via `md:hidden` mounting.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={lazyRoute(<LoginPage />, "100vh")} />
      <Route path="/register" element={lazyRoute(<RegisterPage />)} />
      <Route path="/forgot-password" element={lazyRoute(<ForgotPasswordPage />)} />
      <Route path="/reset-password" element={lazyRoute(<ResetPasswordPage />)} />
      <Route path="/share/:token" element={lazyRoute(<SharedNotePage />)} />
      <Route
        path="/"
        element={lazyRoute(
          <RequireAuth>
            <MainLayout />
          </RequireAuth>,
          "100vh"
        )}
      >
        {/*
          PR3 hotfix (shell-redesign-v1): the `/` route is now a
          layout route with an index child route. The child
          (MobileHomePage) is what `<Outlet/>` inside the
          MobileShell mounted in MainLayout renders. Pre-PR3
          the `<Outlet/>` resolved to nothing (no child route
          existed), leaving the mobile home body empty between
          AppBar and BottomNav. Adding this index route is the
          minimal structural fix — the desktop branch is
          unchanged because the MobileShell subtree stays
          `md:hidden` (REQ-LAY-01 desktop-pixel-identical).
        */}
        <Route index element={lazyRoute(<MobileHomePage />)} />
      </Route>
      {/* PR2 mobile drill-down routes — each page renders its content
          inside MobileShell so the chrome (AppBar + BottomNav + SideSheet)
          is consistent regardless of whether the user navigated here from
          `/` (where MobileShell is already mounted inside MainLayout) or
          directly via deep-link / browser history. */}
      <Route
        path="/notes/:id"
        element={lazyRoute(
          <RequireAuth>
            <MobileShell>
              <MobileNotePage />
            </MobileShell>
          </RequireAuth>
        )}
      />
      <Route
        path="/new"
        element={lazyRoute(
          <RequireAuth>
            <MobileShell>
              <NewNotePage />
            </MobileShell>
          </RequireAuth>
        )}
      />
      <Route
        path="/search"
        element={lazyRoute(
          <RequireAuth>
            <MobileShell>
              <MobileSearchPage />
            </MobileShell>
          </RequireAuth>
        )}
      />
      <Route
        path="/profile"
        element={lazyRoute(
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        )}
      />
      <Route
        path="/settings"
        element={lazyRoute(
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeWatcher />
      <CloseDialog />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}