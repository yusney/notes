import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

function renderProfilePage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );
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
