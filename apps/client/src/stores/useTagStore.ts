import { create } from "zustand";
import type { Tag } from "../types";
import { apiClient } from "../api/client";

interface TagStore {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;

  fetchTags: () => Promise<void>;
  createTag: (name: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
}

export const useTagStore = create<TagStore>((set) => ({
  tags: [],
  isLoading: false,
  error: null,

  fetchTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const tags = await apiClient.get<Tag[]>("/api/tags");
      set({ tags, isLoading: false });
    } catch {
      set({ isLoading: false, error: "Error al cargar etiquetas" });
    }
  },

  createTag: async (name: string) => {
    const { id } = await apiClient.post<{ id: string }>("/api/tags", { name });
    const newTag: Tag = {
      id,
      name,
      userId: "",
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ tags: [...s.tags, newTag] }));
  },

  deleteTag: async (id: string) => {
    await apiClient.delete(`/api/tags/${id}`);
    set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
  },
}));
