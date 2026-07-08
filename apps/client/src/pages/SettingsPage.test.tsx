import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
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

function renderSettingsPage(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SettingsPage />
    </MemoryRouter>
  );
}

/** Per-test matchMedia override (mobile vs wide viewport). */
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

describe("SettingsPage (PR3 — mobile wrapper)", () => {
  afterEach(() => cleanup());

  it("on mobile: wraps content in MobileShell with an AppBar (testid=app-bar)", async () => {
    mockMatchMedia(true);
    renderSettingsPage("/settings");

    await waitFor(() => {
      expect(screen.getByTestId("app-bar")).toBeInTheDocument();
    });
    // BottomNav mounts inside MobileShell on mobile (4 items).
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    // AppBar title is derived from the route (see MobileShell.getMobileTitle).
    expect(screen.getByTestId("app-bar")).toHaveTextContent(/configuraci/i);
  });

  it("on mobile: shows the hamburger menu (testid=mobile-menu-button) instead of the wide-viewport text link", async () => {
    mockMatchMedia(true);
    renderSettingsPage("/settings");

    await waitFor(() => {
      expect(screen.getByTestId("app-bar")).toBeInTheDocument();
    });
    // MobileShell uses the hamburger on the shared app screens.
    expect(screen.getByTestId("mobile-menu-button")).toBeInTheDocument();
    // The wide-viewport-only text link must NOT render on mobile.
    expect(screen.queryByRole("link", { name: /volver/i })).not.toBeInTheDocument();
  });

  it("on mobile: page body owns vertical scroll inside MobileShell", async () => {
    mockMatchMedia(true);
    renderSettingsPage("/settings");

    await waitFor(() => {
      expect(screen.getByTestId("settings-page-body")).toBeInTheDocument();
    });
    expect(screen.getByTestId("settings-page-body").className).toMatch(/overflow-y-auto/);
    expect(screen.getByTestId("settings-page-body").className).not.toMatch(/min-h-screen/);
  });

  it("on wide viewports: keeps the wide-viewport text '← Volver' Link and does NOT wrap in MobileShell", async () => {
    mockMatchMedia(false);
    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /volver/i })).toBeInTheDocument();
    });
    // The mobile AppBar + BottomNav must NOT be in the wide-viewport tree
    // (REQ-LAY-01 — wide-viewport layout untouched).
    expect(screen.queryByTestId("app-bar")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
