import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RegisterPage } from "./RegisterPage";
import { useAuthStore } from "../stores/useAuthStore";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.setState({
    user: null, accessToken: null, refreshToken: null,
    isAuthenticated: false, isLoading: false, error: null,
  });
  vi.restoreAllMocks();
});

describe("RegisterPage", () => {
  it("renders name, email and password fields", () => {
    renderRegisterPage();

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i, { selector: "input" })).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    renderRegisterPage();
    expect(screen.getByRole("button", { name: /registrarse/i })).toBeInTheDocument();
  });

  it("shows validation error when password is less than 8 characters", async () => {
    renderRegisterPage();

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "User" } });
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: "u@t.com" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: "input" }), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /registrarse/i }));

    await waitFor(() => {
      expect(screen.getByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
    });
  });

  it("shows validation error when password has no number", async () => {
    renderRegisterPage();

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "User" } });
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: "u@t.com" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: "input" }), {
      target: { value: "NoNumbers!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /registrarse/i }));

    await waitFor(() => {
      expect(screen.getByText(/al menos 1 número/i)).toBeInTheDocument();
    });
  });

  it("shows error when name is empty", async () => {
    renderRegisterPage();

    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: "u@t.com" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: "input" }), {
      target: { value: "Password1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /registrarse/i }));

    await waitFor(() => {
      expect(screen.getByText(/nombre es requerido/i)).toBeInTheDocument();
    });
  });

  it("renders a link to the login page", () => {
    renderRegisterPage();
    expect(screen.getByRole("link", { name: /inicia sesión/i })).toBeInTheDocument();
  });
});
