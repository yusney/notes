/**
 * Theme persistence flow integration test.
 *
 * Flow: fetch preferences from API → apply theme → update preferences via API
 *       → re-fetch (simulated reload) → verify theme still applied.
 *
 * Uses the real store + resolveTheme, mocking only apiClient at the boundary.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePreferencesStore } from "../stores/usePreferencesStore";
import { resolveTheme } from "./useTheme";

vi.mock("../api/client", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import { apiClient } from "../api/client";

beforeEach(() => {
  usePreferencesStore.setState({
    theme: "system",
    sortBy: "creation",
    sortOrder: "desc",
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe("Theme persistence flow (store + resolveTheme integration)", () => {
  it("fetch dark theme from API → resolveTheme returns dark", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      theme: "dark",
      sortBy: "creation",
      sortOrder: "desc",
    });

    await usePreferencesStore.getState().fetchPreferences();

    const { theme } = usePreferencesStore.getState();
    expect(theme).toBe("dark");

    // resolveTheme with stored 'dark' and any system pref returns 'dark'
    expect(resolveTheme(theme, false)).toBe("dark");
    expect(resolveTheme(theme, true)).toBe("dark");
  });

  it("update theme to light → re-fetch confirms persistence", async () => {
    // Arrange: PUT responds with light
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      theme: "light",
      sortBy: "creation",
      sortOrder: "desc",
    });
    // Arrange: subsequent GET responds with light (simulated reload)
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      theme: "light",
      sortBy: "creation",
      sortOrder: "desc",
    });

    // Act: update preferences (like user clicking "Light" in SettingsPage)
    await usePreferencesStore.getState().updatePreferences({
      theme: "light",
      sortBy: "creation",
      sortOrder: "desc",
    });

    expect(usePreferencesStore.getState().theme).toBe("light");

    // Act: simulate page reload — fetch preferences again
    await usePreferencesStore.getState().fetchPreferences();

    // Assert: theme is still light after "reload"
    const { theme } = usePreferencesStore.getState();
    expect(theme).toBe("light");
    expect(resolveTheme(theme, true)).toBe("light");
  });

  it("system theme → resolveTheme delegates to system preference", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      theme: "system",
      sortBy: "creation",
      sortOrder: "desc",
    });

    await usePreferencesStore.getState().fetchPreferences();

    const { theme } = usePreferencesStore.getState();
    expect(theme).toBe("system");

    // resolveTheme defers to system pref when theme is 'system'
    expect(resolveTheme(theme, true)).toBe("dark");
    expect(resolveTheme(theme, false)).toBe("light");
  });
});
