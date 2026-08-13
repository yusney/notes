import { create } from "zustand";

/**
 * Mobile search query — shared between the SearchBar in the AppBar
 * (which the user types into) and the MobileSearchPage (which reads
 * the query to filter notes).
 *
 * This is mobile-only and intentionally separate from `useNoteStore.searchQuery`:
 *   - `useNoteStore.searchQuery` is the wide-viewport list filter (a
 *     backend query, resets page + visibleNoteIds on change).
 *   - `useMobileSearchStore.query` is a local mobile filter on the
 *     already-loaded notes list. Decoupling means typing in the mobile
 *     search bar doesn't reset the wide-viewport list's pagination
 *     state.
 *
 * Lifecycle: MobileShell resets the query when the user leaves `/search`,
 * so returning through the bottom nav starts from a fresh empty input.
 */
interface MobileSearchState {
  query: string;
  setQuery: (q: string) => void;
  resetQuery: () => void;
}

export const useMobileSearchStore = create<MobileSearchState>((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
  resetQuery: () => set({ query: "" }),
}));
