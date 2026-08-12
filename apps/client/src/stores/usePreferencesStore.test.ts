import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePreferencesStore } from "./usePreferencesStore";

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

describe("usePreferencesStore", () => {
  it("has default state with system theme, creation sort desc", () => {
    const state = usePreferencesStore.getState();
    expect(state.theme).toBe("system");
    expect(state.sortBy).toBe("creation");
    expect(state.sortOrder).toBe("desc");
  });

  it("fetchPreferences maps API values to frontend values", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      theme: "dark",
      sortBy: "Title",       // API returns PascalCase enum names
      sortOrder: "Asc",
    });

    await usePreferencesStore.getState().fetchPreferences();

    const state = usePreferencesStore.getState();
    expect(state.theme).toBe("dark");
    expect(state.sortBy).toBe("alphabetical"); // "Title" → frontend "alphabetical"
    expect(state.sortOrder).toBe("asc");        // "Asc" → frontend "asc"
  });

  it("updatePreferences sends API values and maps response back", async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      theme: "light",
      sortBy: "UpdatedAt",
      sortOrder: "Asc",
    });

    // Call with frontend values
    await usePreferencesStore.getState().updatePreferences({
      theme: "light",
      sortBy: "modification",
      sortOrder: "asc",
    });

    // Should send API values in the PUT body
    expect(apiClient.put).toHaveBeenCalledWith("/api/user/preferences", {
      theme: "light",
      sortBy: "UpdatedAt",   // "modification" → API "UpdatedAt"
      sortOrder: "Asc",      // "asc" → API "Asc"
    });

    const state = usePreferencesStore.getState();
    expect(state.theme).toBe("light");
    expect(state.sortBy).toBe("modification"); // "UpdatedAt" → frontend "modification"
  });

  it("fetchPreferences sets error on failure", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("Network error"));

    await usePreferencesStore.getState().fetchPreferences();

    expect(usePreferencesStore.getState().error).toBeTruthy();
  });
});
