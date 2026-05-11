import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "./SettingsPage";

const { mockPreferences, mockUsePreferencesStore } = vi.hoisted(() => {
  const prefs = {
    sortBy: "creation",
    sortOrder: "desc",
    isLoading: false,
    fetchPreferences: vi.fn().mockResolvedValue(undefined),
    updatePreferences: vi.fn().mockResolvedValue({}),
  };
  const fn = vi.fn(() => prefs);
  (fn as any).getState = () => prefs;
  return { mockPreferences: prefs, mockUsePreferencesStore: fn };
});

vi.mock("../stores/usePreferencesStore", () => ({
  usePreferencesStore: mockUsePreferencesStore,
}));

vi.mock("../hooks/useTheme", () => ({
  useTheme: vi.fn(() => ({
    theme: "system",
    resolvedTheme: "light" as const,
    setTheme: vi.fn(),
  })),
}));

import { useTheme } from "../hooks/useTheme";

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );
}

async function selectOption(comboboxLabel: string, optionLabel: string) {
  const combobox = screen.getByRole("combobox", { name: comboboxLabel });
  fireEvent.click(combobox);
  await waitFor(() => {
    expect(screen.getByRole("option", { name: optionLabel })).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole("option", { name: optionLabel }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPreferences.sortBy = "creation";
  mockPreferences.sortOrder = "desc";
  mockPreferences.isLoading = false;
  mockPreferences.fetchPreferences = vi.fn().mockResolvedValue(undefined);
  mockPreferences.updatePreferences = vi.fn().mockResolvedValue({});
});

describe("SettingsPage", () => {
  it("renders theme selector with System/Light/Dark options", async () => {
    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /tema/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("combobox", { name: /tema/i })).toHaveTextContent("Sistema");
  });

  it("renders default sort preference", async () => {
    mockPreferences.sortBy = "alphabetical";
    mockPreferences.sortOrder = "asc";

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /ordenar por defecto/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("combobox", { name: /ordenar por defecto/i })).toHaveTextContent("Alfabético");
  });

  it("delegates theme change to useTheme().setTheme()", async () => {
    const setThemeMock = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "system",
      resolvedTheme: "light" as const,
      setTheme: setThemeMock,
    });

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /tema/i })).toBeInTheDocument();
    });

    await selectOption("Tema", "Oscuro");

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("saves sort preferences via updatePreferences", async () => {
    const updateMock = vi.fn().mockResolvedValue({});
    mockPreferences.updatePreferences = updateMock;

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /ordenar por defecto/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /guardar configuración/i }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({
        sortBy: "creation",
        sortOrder: "desc",
      });
    });
  });
});
