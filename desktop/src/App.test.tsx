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

  it("/login renders LoginPage", () => {
    renderAt("/login");
    expect(screen.getByTestId("page-login")).toBeInTheDocument();
  });

  it("/register renders RegisterPage", () => {
    renderAt("/register");
    expect(screen.getByTestId("page-register")).toBeInTheDocument();
  });

  it("/forgot-password renders ForgotPasswordPage", () => {
    renderAt("/forgot-password");
    expect(screen.getByTestId("page-forgot")).toBeInTheDocument();
  });

  it("/reset-password renders ResetPasswordPage", () => {
    renderAt("/reset-password");
    expect(screen.getByTestId("page-reset")).toBeInTheDocument();
  });

  it("/share/:token renders SharedNotePage", () => {
    renderAt("/share/abc123");
    expect(screen.getByTestId("page-share")).toBeInTheDocument();
  });

  it("/ renders MainLayout", () => {
    renderAt("/");
    expect(screen.getByTestId("page-main")).toBeInTheDocument();
  });

  it("/profile renders ProfilePage", () => {
    renderAt("/profile");
    expect(screen.getByTestId("page-profile")).toBeInTheDocument();
  });

  it("/settings renders SettingsPage", () => {
    renderAt("/settings");
    expect(screen.getByTestId("page-settings")).toBeInTheDocument();
  });

  it("/notes/:id renders MobileNotePage (PR2 — new mobile drill-down route)", () => {
    renderAt("/notes/abc-123");
    expect(screen.getByTestId("page-note-mobile")).toBeInTheDocument();
  });

  it("/new renders NewNotePage (PR2 — new stub route)", () => {
    renderAt("/new");
    expect(screen.getByTestId("page-new")).toBeInTheDocument();
  });

  it("/search renders MobileSearchPage (PR2 — new full-screen route)", () => {
    renderAt("/search");
    expect(screen.getByTestId("page-search")).toBeInTheDocument();
  });

  it("unknown route redirects to /", () => {
    renderAt("/this-route-does-not-exist");
    expect(screen.getByTestId("page-main")).toBeInTheDocument();
  });
});