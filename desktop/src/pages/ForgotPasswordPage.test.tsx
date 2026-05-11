import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ForgotPasswordPage", () => {
  it("renders email input and submit button", () => {
    renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar/i })).toBeInTheDocument();
  });

  it("shows validation error when submitting empty email", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));
    await waitFor(() => {
      expect(screen.getByText(/email es requerido/i)).toBeInTheDocument();
    });
  });

  it("shows success state after successful submission", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/revisá tu email/i)).toBeInTheDocument();
    });
  });

  it("shows generic error message on failed submission (no info leak)", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "User not found" }),
    });

    renderPage();
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "noexiste@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    // Should NOT show the backend's specific message (info leak)
    expect(screen.queryByText("User not found")).not.toBeInTheDocument();
  });

  it("has a link back to login page", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /volver/i })).toBeInTheDocument();
  });
});
