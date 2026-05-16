import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./AuthProvider";
import { useAuthStore } from "../../stores/useAuthStore";

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
  it("renders protected content when user is authenticated", () => {
    renderWithRouter(true, "/");
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to /login when user is NOT authenticated", () => {
    renderWithRouter(false, "/");
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("does not redirect authenticated user to login", () => {
    renderWithRouter(true, "/");
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
