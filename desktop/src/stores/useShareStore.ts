import { create } from "zustand";
import type { SharedLink } from "../types";
import { apiClient } from "../api/client";

interface ShareStore {
  links: SharedLink[];
  isLoading: boolean;
  error: string | null;

  fetchSharedLinks: (noteId: string) => Promise<void>;
  createShareLink: (noteId: string, expiresAt: string | null) => Promise<SharedLink>;
  revokeShareLink: (token: string) => Promise<void>;
}

export const useShareStore = create<ShareStore>((set) => ({
  links: [],
  isLoading: false,
  error: null,

  fetchSharedLinks: async (noteId: string) => {
    set({ isLoading: true, error: null });
    try {
      const links = await apiClient.get<SharedLink[]>(`/api/shared-links?noteId=${noteId}`);
      set({ links, isLoading: false });
    } catch {
      set({ isLoading: false, error: "Error al cargar los enlaces compartidos" });
    }
  },

  createShareLink: async (noteId: string, expiresAt: string | null) => {
    const link = await apiClient.post<SharedLink>(`/api/notes/${noteId}/share`, { expiresAt });
    set((s) => ({ links: [...s.links, link] }));
    return link;
  },

  revokeShareLink: async (token: string) => {
    await apiClient.delete(`/api/shared-links/${token}`);
    set((s) => ({ links: s.links.filter((l) => l.token !== token) }));
  },
}));
