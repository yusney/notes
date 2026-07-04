import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./components/auth/AuthProvider";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { MainLayout } from "./pages/MainLayout";
import { SharedNotePage } from "./pages/SharedNotePage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { MobileNotePage } from "./pages/MobileNotePage";
import { NewNotePage } from "./pages/NewNotePage";
import { MobileSearchPage } from "./pages/MobileSearchPage";
import { MobileShell } from "./components/layout/MobileShell";
import { useTheme } from "./hooks/useTheme";
import { CloseDialog } from "./components/CloseDialog";

function ThemeWatcher() {
  // Mount useTheme to trigger initial theme application via applyThemeToDocument in useTheme.ts
  useTheme();
  return null;
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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/share/:token" element={<SharedNotePage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      />
      {/* PR2 mobile drill-down routes — each page renders its content
          inside MobileShell so the chrome (AppBar + BottomNav + SideSheet)
          is consistent regardless of whether the user navigated here from
          `/` (where MobileShell is already mounted inside MainLayout) or
          directly via deep-link / browser history. */}
      <Route
        path="/notes/:id"
        element={
          <RequireAuth>
            <MobileShell>
              <MobileNotePage />
            </MobileShell>
          </RequireAuth>
        }
      />
      <Route
        path="/new"
        element={
          <RequireAuth>
            <MobileShell>
              <NewNotePage />
            </MobileShell>
          </RequireAuth>
        }
      />
      <Route
        path="/search"
        element={
          <RequireAuth>
            <MobileShell>
              <MobileSearchPage />
            </MobileShell>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
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