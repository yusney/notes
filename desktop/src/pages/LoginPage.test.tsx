import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { useAuthStore } from "../stores/useAuthStore";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("renders email and password fields", () => {
    renderLoginPage();

    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i, { selector: "input" })).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    renderLoginPage();
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it("shows validation error when submitting with empty email", async () => {
    renderLoginPage();

    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/email es requerido/i)).toBeInTheDocument();
    });
  });

  it("shows validation error when submitting with empty password", async () => {
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/contraseña es requerida/i)).toBeInTheDocument();
    });
  });

  it("disables submit button while loading", async () => {
    global.fetch = vi.fn().mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: "input" }), {
      target: { value: "Password1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /iniciando/i })).toBeDisabled();
    });
  });

  it("shows error message on failed login", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Credenciales inválidas" }),
    });
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "bad@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: "input" }), {
      target: { value: "wrong123!" },
    });

    const submitBtn = screen.getByRole("button", { name: /iniciar sesión|iniciando/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Credenciales inválidas");
    });
  });

  it("renders a link to the register page", () => {
    renderLoginPage();
    expect(screen.getByRole("link", { name: /regístrate/i })).toBeInTheDocument();
  });

  it("renders a link to forgot password page", () => {
    renderLoginPage();
    expect(screen.getByRole("link", { name: /olvidaste tu contraseña/i })).toBeInTheDocument();
  });

  it("renders Google OAuth button", () => {
    renderLoginPage();
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
  });

  it("renders GitHub OAuth button", () => {
    renderLoginPage();
    expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
  });

  it("calls openUrl when clicking Google OAuth button", async () => {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    renderLoginPage();

    fireEvent.click(screen.getByRole("button", { name: /google/i }));

    await waitFor(() => {
      expect(openUrl).toHaveBeenCalledWith(expect.stringContaining("google"));
    });
  });

  it("calls openUrl when clicking GitHub OAuth button", async () => {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    renderLoginPage();

    fireEvent.click(screen.getByRole("button", { name: /github/i }));

    await waitFor(() => {
      expect(openUrl).toHaveBeenCalledWith(expect.stringContaining("github"));
    });
  });
});
