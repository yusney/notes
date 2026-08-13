import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfilePage } from "./ProfilePage";
import { useAuthStore } from "../stores/useAuthStore";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...(actual as object),
    apiClient: {
      get: vi.fn(),
      put: vi.fn(),
    },
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

import { apiClient } from "../api/client";

function renderProfilePage(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ProfilePage />
    </MemoryRouter>
  );
}

/**
 * Helper to mock `window.matchMedia` so the page renders as either
 * mobile (matches=true for the mobile query) or wide-viewport (matches=false).
 * The default jsdom matchMedia polyfill in test-setup.ts always returns
 * matches=false, which is the wide-viewport shape — we override per-test.
 */
function mockMatchMedia(mobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === "(max-width: 767px)"
          ? mobile
          : query === "(prefers-reduced-motion: reduce)"
            ? false
            : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  useAuthStore.setState({
    user: { id: "u1", name: "Juan Pérez", email: "juan@test.com" },
    accessToken: "tok",

    isAuthenticated: true,
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ProfilePage", () => {
  it("displays user name and email", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      name: "Juan Pérez",
      email: "juan@test.com",
      provider: "local",
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Juan Pérez")).toBeInTheDocument();
    });
    expect(screen.getByText("juan@test.com")).toBeInTheDocument();
  });

  it("shows auth provider", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      name: "Juan Pérez",
      email: "juan@test.com",
      provider: "google",
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText(/google/i)).toBeInTheDocument();
    });
  });

  it("allows editing display name", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      name: "Juan Pérez",
      email: "juan@test.com",
      provider: "local",
    });
    vi.mocked(apiClient.put).mockResolvedValueOnce({ name: "Juan Updated" });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Juan Pérez")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue("Juan Pérez"), {
      target: { value: "Juan Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar nombre/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        "/api/user/profile",
        expect.objectContaining({ name: "Juan Updated" })
      );
    });
  });

  it("shows change password form for local provider", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      name: "Juan Pérez",
      email: "juan@test.com",
      provider: "local",
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/contraseña actual/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/nueva contraseña/i)).toBeInTheDocument();
  });

  it("does not show change password form for oauth provider", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      name: "Juan Pérez",
      email: "juan@test.com",
      provider: "github",
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText(/github/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/contraseña actual/i)).not.toBeInTheDocument();
  });
});

describe("ProfilePage (PR3 — mobile wrapper)", () => {
  afterEach(() => cleanup());

  it("on mobile: wraps content in MobileShell with an AppBar (testid=app-bar)", async () => {
    mockMatchMedia(true);
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      name: "Juan Pérez",
      email: "juan@test.com",
      provider: "local",
    });

    renderProfilePage("/profile");

    await waitFor(() => {
      // MobileShell always renders the AppBar from PR1.
      expect(screen.getByTestId("app-bar")).toBeInTheDocument();
    });
    // BottomNav mounts inside MobileShell on mobile (4 items).
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    // AppBar title is derived from the route (see MobileShell.getMobileTitle).
    expect(screen.getByTestId("app-bar")).toHaveTextContent(/perfil/i);
  });

  it("on mobile: shows the hamburger menu (testid=mobile-menu-button) instead of the wide-viewport text link", async () => {
    mockMatchMedia(true);
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      name: "Juan Pérez",
      email: "juan@test.com",
      provider: "local",
    });

    renderProfilePage("/profile");

    await waitFor(() => {
      expect(screen.getByTestId("app-bar")).toBeInTheDocument();
    });
    // MobileShell uses the hamburger on the shared app screens.
    expect(screen.getByTestId("mobile-menu-button")).toBeInTheDocument();
    // The wide-viewport-only text link must NOT render on mobile (the AppBar
    // chevron replaces it — a duplicate "← Volver" would be confusing).
    expect(screen.queryByRole("link", { name: /volver/i })).not.toBeInTheDocument();
  });

  it("on mobile: page body owns vertical scroll inside MobileShell", async () => {
    mockMatchMedia(true);
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      name: "Juan Pérez",
      email: "juan@test.com",
      provider: "local",
    });

    renderProfilePage("/profile");

    await waitFor(() => {
      expect(screen.getByTestId("profile-page-body")).toBeInTheDocument();
    });
    expect(screen.getByTestId("profile-page-body").className).toMatch(/overflow-y-auto/);
    expect(screen.getByTestId("profile-page-body").className).not.toMatch(/min-h-screen/);
  });

  it("on wide viewports: keeps the wide-viewport text '← Volver' Link and does NOT wrap in MobileShell", async () => {
    mockMatchMedia(false);
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      name: "Juan Pérez",
      email: "juan@test.com",
      provider: "local",
    });

    renderProfilePage();

    await waitFor(() => {
      // The wide-viewport back link is still the first interactive element.
      expect(screen.getByRole("link", { name: /volver/i })).toBeInTheDocument();
    });
    // The mobile AppBar + BottomNav must NOT be in the wide-viewport tree
    // (REQ-LAY-01 — wide-viewport layout untouched).
    expect(screen.queryByTestId("app-bar")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
