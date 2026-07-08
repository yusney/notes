import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ResetPasswordPage } from "./ResetPasswordPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage(token?: string) {
  const search = token ? `?token=${token}` : "";
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockReset();
});

describe("ResetPasswordPage", () => {
  it("shows invalid token message when no token in URL", async () => {
    global.fetch = vi.fn(); // should not be called
    renderPage(); // no token
    await waitFor(() => {
      expect(screen.getByText(/enlace inválido/i)).toBeInTheDocument();
    });
  });

  it("shows invalid token message when token validation fails", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid token" }),
    });

    renderPage("bad-token");
    await waitFor(() => {
      expect(screen.getByText(/enlace inválido/i)).toBeInTheDocument();
    });
  });

  it("shows password form when token is valid", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ isValid: true }),
    });

    renderPage("valid-token-abc");
    await waitFor(() => {
      expect(screen.getByLabelText(/nueva contraseña/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /restablecer/i })).toBeInTheDocument();
    });
  });

  it("shows weak password error when password does not meet requirements", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ isValid: true }),
    });

    renderPage("valid-token-abc");
    await waitFor(() => {
      expect(screen.getByLabelText(/nueva contraseña/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), {
      target: { value: "weak" },
    });
    fireEvent.click(screen.getByRole("button", { name: /restablecer/i }));

    await waitFor(() => {
      expect(screen.getByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
    });
  });

  it("redirects to login on successful password reset", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ isValid: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

    renderPage("valid-token-abc");
    await waitFor(() => {
      expect(screen.getByLabelText(/nueva contraseña/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), {
      target: { value: "NewPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /restablecer/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
