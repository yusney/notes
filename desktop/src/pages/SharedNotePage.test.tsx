import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SharedNotePage } from "./SharedNotePage";

vi.mock("../api/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from "../api/client";

describe("SharedNotePage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("shows loading state while fetching", () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={["/share/abc123"]}>
        <Routes>
          <Route path="/share/:token" element={<SharedNotePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("shows note title and content when loaded successfully", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      title: "Mi nota compartida",
      content: "<p>Contenido de la nota</p>",
    });

    render(
      <MemoryRouter initialEntries={["/share/abc123"]}>
        <Routes>
          <Route path="/share/:token" element={<SharedNotePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Mi nota compartida")).toBeInTheDocument();
    });
  });

  it("shows not found message when token is invalid", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("Not Found"));

    render(
      <MemoryRouter initialEntries={["/share/invalid"]}>
        <Routes>
          <Route path="/share/:token" element={<SharedNotePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/nota no encontrada/i)).toBeInTheDocument();
    });
  });
});
