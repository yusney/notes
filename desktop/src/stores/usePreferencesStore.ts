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

// Map frontend SortBy values to API enum names (PascalCase)
const SORT_BY_TO_API: Record<SortBy, string> = {
  creation: "CreatedAt",
  modification: "UpdatedAt",
  alphabetical: "Title",
};

const SORT_BY_FROM_API: Record<string, SortBy> = {
  CreatedAt: "creation",
  UpdatedAt: "modification",
  Title: "alphabetical",
};

const SORT_ORDER_TO_API: Record<SortOrder, string> = {
  asc: "Asc",
  desc: "Desc",
};

const SORT_ORDER_FROM_API: Record<string, SortOrder> = {
  Asc: "asc",
  Desc: "desc",
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  theme: "system",
  sortBy: "creation",
  sortOrder: "desc",
  isLoading: false,
  error: null,

  fetchPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.get<{ theme: string; sortBy: string; sortOrder: string }>("/api/user/preferences");
      set({
        theme: data.theme ?? "system",
        sortBy: SORT_BY_FROM_API[data.sortBy] ?? "creation",
        sortOrder: SORT_ORDER_FROM_API[data.sortOrder] ?? "desc",
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
        theme: prefs.theme ?? current.theme,
        sortBy: prefs.sortBy ? SORT_BY_TO_API[prefs.sortBy] : SORT_BY_TO_API[current.sortBy],
        sortOrder: prefs.sortOrder ? SORT_ORDER_TO_API[prefs.sortOrder] : SORT_ORDER_TO_API[current.sortOrder],
      };
      const data = await apiClient.put<{ theme: string; sortBy: string; sortOrder: string }>("/api/user/preferences", payload);
      set({
        theme: data.theme ?? payload.theme,
        sortBy: SORT_BY_FROM_API[data.sortBy] ?? "creation",
        sortOrder: SORT_ORDER_FROM_API[data.sortOrder] ?? "desc",
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error updating preferences";
      set({ isLoading: false, error: msg });
      throw err;
    }
  },
}));
