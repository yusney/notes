import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./App";

// Mock RequireAuth so we don't need the real auth backend for routing tests.
vi.mock("./components/auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the page components — we just want to assert the ROUTES wire them
// up at the right paths. Each stub renders a data-testid with the route.
vi.mock("./pages/LoginPage", () => ({
  LoginPage: () => <div data-testid="page-login" />,
}));
vi.mock("./pages/RegisterPage", () => ({
  RegisterPage: () => <div data-testid="page-register" />,
}));
vi.mock("./pages/ForgotPasswordPage", () => ({
  ForgotPasswordPage: () => <div data-testid="page-forgot" />,
}));
vi.mock("./pages/ResetPasswordPage", () => ({
  ResetPasswordPage: () => <div data-testid="page-reset" />,
}));
vi.mock("./pages/SharedNotePage", () => ({
  SharedNotePage: () => <div data-testid="page-share" />,
}));
vi.mock("./pages/MainLayout", () => ({
  MainLayout: () => <div data-testid="page-main" />,
}));
vi.mock("./pages/ProfilePage", () => ({
  ProfilePage: () => <div data-testid="page-profile" />,
}));
vi.mock("./pages/SettingsPage", () => ({
  SettingsPage: () => <div data-testid="page-settings" />,
}));
vi.mock("./pages/MobileNotePage", () => ({
  MobileNotePage: () => <div data-testid="page-note-mobile" />,
}));
vi.mock("./pages/NewNotePage", () => ({
  NewNotePage: () => <div data-testid="page-new" />,
}));
vi.mock("./pages/MobileSearchPage", () => ({
  MobileSearchPage: () => <div data-testid="page-search" />,
}));
vi.mock("./pages/MobileHomePage", () => ({
  MobileHomePage: () => <div data-testid="page-home-mobile" />,
}));
vi.mock("./components/layout/MobileShell", () => ({
  MobileShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("AppRoutes (PR2 — shell-redesign-v1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // REQ-PERF-02 — every page is loaded via React.lazy(), so the import
  // resolves on a microtask. findByTestId awaits the resolution; the
  // sync getByTestId would catch the Suspense fallback instead.

  it("/login renders LoginPage", async () => {
    renderAt("/login");
    expect(await screen.findByTestId("page-login")).toBeInTheDocument();
  });

  it("/register renders RegisterPage", async () => {
    renderAt("/register");
    expect(await screen.findByTestId("page-register")).toBeInTheDocument();
  });

  it("/forgot-password renders ForgotPasswordPage", async () => {
    renderAt("/forgot-password");
    expect(await screen.findByTestId("page-forgot")).toBeInTheDocument();
  });

  it("/reset-password renders ResetPasswordPage", async () => {
    renderAt("/reset-password");
    expect(await screen.findByTestId("page-reset")).toBeInTheDocument();
  });

  it("/share/:token renders SharedNotePage", async () => {
    renderAt("/share/abc123");
    expect(await screen.findByTestId("page-share")).toBeInTheDocument();
  });

  it("/ renders MainLayout", async () => {
    renderAt("/");
    expect(await screen.findByTestId("page-main")).toBeInTheDocument();
  });

  it("/profile renders ProfilePage", async () => {
    renderAt("/profile");
    expect(await screen.findByTestId("page-profile")).toBeInTheDocument();
  });

  it("/settings renders SettingsPage", async () => {
    renderAt("/settings");
    expect(await screen.findByTestId("page-settings")).toBeInTheDocument();
  });

  it("/notes/:id renders MobileNotePage (PR2 — new mobile drill-down route)", async () => {
    renderAt("/notes/abc-123");
    expect(await screen.findByTestId("page-note-mobile")).toBeInTheDocument();
  });

  it("/new renders NewNotePage (PR2 — new stub route)", async () => {
    renderAt("/new");
    expect(await screen.findByTestId("page-new")).toBeInTheDocument();
  });

  it("/search renders MobileSearchPage (PR2 — new full-screen route)", async () => {
    renderAt("/search");
    expect(await screen.findByTestId("page-search")).toBeInTheDocument();
  });

  it("unknown route redirects to /", async () => {
    renderAt("/this-route-does-not-exist");
    expect(await screen.findByTestId("page-main")).toBeInTheDocument();
  });

  // REQ-PERF-02 — route-level code splitting. Cold-boot to /login must
  // NOT trigger a MainLayout chunk fetch. The simplest behavioral
  // assertion: when we render at /login, the LoginPage mock resolves
  // but the MainLayout mock factory has NOT been invoked for an actual
  // mount. We use a factory that records calls and verify the count
  // delta after rendering /login only.
  it("cold-boot to /login does NOT load the MainLayout chunk", async () => {
    let mainLayoutMounts = 0;
    const TrackedMainLayout = () => {
      mainLayoutMounts += 1;
      return <div data-testid="page-main" />;
    };

    // Re-mock with the tracking factory for THIS test only.
    vi.doMock("./pages/MainLayout", () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MainLayout: TrackedMainLayout as any,
    }));
    // We don't re-import App.tsx (would invalidate other tests); we
    // use the cached module graph. The lazy() import for MainLayout
    // resolves the mock at first render of <MainLayout />. If /login
    // never causes <MainLayout /> to render, the factory's mount
    // counter stays zero.

    const before = mainLayoutMounts;
    renderAt("/login");
    // Wait for the LoginPage chunk to resolve and render.
    await screen.findByTestId("page-login");
    // Flush microtasks to ensure any deferred lazy imports would resolve.
    await Promise.resolve();
    await Promise.resolve();
    expect(mainLayoutMounts).toBe(before);
    // Login page is visible; MainLayout was NOT mounted.
    expect(screen.getByTestId("page-login")).toBeInTheDocument();
    expect(screen.queryByTestId("page-main")).not.toBeInTheDocument();
    vi.doUnmock("./pages/MainLayout");
  });
});
