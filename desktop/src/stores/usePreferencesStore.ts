import { create } from "zustand";
import { apiClient } from "../api/client";

export type SortBy = "creation" | "modification" | "alphabetical";
export type SortOrder = "asc" | "desc";

interface UserPreferences {
  theme: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
}

interface PreferencesState {
  theme: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
  isLoading: boolean;
  error: string | null;

  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  theme: "system",
  sortBy: "creation",
  sortOrder: "desc",
  isLoading: false,
  error: null,

  fetchPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.get<UserPreferences>("/api/user/preferences");
      set({
        theme: data.theme ?? "system",
        sortBy: (data.sortBy as SortBy) ?? "creation",
        sortOrder: (data.sortOrder as SortOrder) ?? "desc",
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error loading preferences";
      set({ isLoading: false, error: msg });
    }
  },

  updatePreferences: async (prefs) => {
    set({ isLoading: true, error: null });
    try {
      const current = get();
      const payload = {
        theme: current.theme,
        sortBy: current.sortBy,
        sortOrder: current.sortOrder,
        ...prefs,
      };
      const data = await apiClient.put<UserPreferences>("/api/user/preferences", payload);
      set({
        theme: data.theme ?? payload.theme,
        sortBy: (data.sortBy as SortBy) ?? payload.sortBy,
        sortOrder: (data.sortOrder as SortOrder) ?? payload.sortOrder,
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error updating preferences";
      set({ isLoading: false, error: msg });
      throw err;
    }
  },
}));
