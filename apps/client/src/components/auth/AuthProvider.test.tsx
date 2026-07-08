import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./AuthProvider";
import { useAuthStore } from "../../stores/useAuthStore";

// Mock loadRuntimeConfig so AuthProvider doesn't hang waiting for config
vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>(
    "../../api/client"
  );
  return {
    ...actual,
    loadRuntimeConfig: vi.fn().mockResolvedValue(undefined),
  };
});

function TestProtected() {
  return <div>Protected content</div>;
}

function TestLogin() {
  return <div>Login page</div>;
}

function renderWithRouter(isAuthenticated: boolean, startPath = "/") {
  useAuthStore.setState({
    isAuthenticated,
    isInitialized: true, // skip the initialize() loader in tests
    user: isAuthenticated ? { id: "1", email: "a@b.com", name: "Test" } : null,
    accessToken: isAuthenticated ? "token" : null,
    isLoading: false,
    error: null,
  });

  return render(
    <MemoryRouter initialEntries={[startPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<TestLogin />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <TestProtected />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.setState({
    user: null, accessToken: null,
    isAuthenticated: false, isInitialized: true, isLoading: false, error: null,
  });
});

describe("AuthProvider / RequireAuth", () => {
  it("renders protected content when user is authenticated", async () => {
    renderWithRouter(true, "/");
    await waitFor(() =>
      expect(screen.getByText("Protected content")).toBeInTheDocument()
    );
  });

  it("redirects to /login when user is NOT authenticated", async () => {
    renderWithRouter(false, "/");
    await waitFor(() =>
      expect(screen.getByText("Login page")).toBeInTheDocument()
    );
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("does not redirect authenticated user to login", async () => {
    renderWithRouter(true, "/");
    await waitFor(() =>
      expect(screen.queryByText("Login page")).not.toBeInTheDocument()
    );
  });
});

// ────────────────────────────────────────────────────────────────────────
// REQ-PERF-01 — Auth-gate split
// AuthProvider MUST NOT block first paint on a global <LoadingScreen />.
// Login routes render immediately while initialize() is in flight.
// RequireAuth still blocks protected content with no flash until
// isInitialized=true.
// ────────────────────────────────────────────────────────────────────────
describe("AuthProvider REQ-PERF-01 — non-protected routes render during init", () => {
  function renderWithAuthState(initialPath: string, opts: { isInitialized: boolean; isAuthenticated: boolean }) {
    useAuthStore.setState({
      isAuthenticated: opts.isAuthenticated,
      isInitialized: opts.isInitialized,
      user: opts.isAuthenticated ? { id: "1", email: "a@b.com", name: "Test" } : null,
      accessToken: opts.isAuthenticated ? "token" : null,
      isLoading: false,
      error: null,
    });

    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<TestLogin />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <TestProtected />
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it("/login renders Login page immediately when isInitialized=false", () => {
    // SPEC: Login route MUST NOT block on LoadingScreen during init.
    renderWithAuthState("/login", { isInitialized: false, isAuthenticated: false });

    // The Login page must be visible WITHOUT needing waitFor — that's the
    // performance claim under test.
    expect(screen.getByText("Login page")).toBeInTheDocument();
    // No global LoadingScreen should be blocking.
    expect(screen.queryByText(/restaurando sesión/i)).not.toBeInTheDocument();
  });

  it("RequireAuth blocks protected content with no flash when isInitialized=false", () => {
    renderWithAuthState("/", { isInitialized: false, isAuthenticated: false });

    // RequireAuth MUST show the LoadingScreen — no protected content flash.
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.getByText(/restaurando sesión/i)).toBeInTheDocument();
  });

  it("RequireAuth renders protected content after init + auth", async () => {
    renderWithAuthState("/", { isInitialized: true, isAuthenticated: true });

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("RequireAuth redirects to /login when isInitialized=true but !isAuthenticated", async () => {
    renderWithAuthState("/", { isInitialized: true, isAuthenticated: false });

    await waitFor(() =>
      expect(screen.getByText("Login page")).toBeInTheDocument()
    );
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});
