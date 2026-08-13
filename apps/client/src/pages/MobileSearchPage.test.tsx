import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MobileSearchPage } from "./MobileSearchPage";
import { SearchBar } from "../components/notes/SearchBar";
import { useMobileSearchStore } from "../stores/useMobileSearchStore";

const NOTE_1 = {
  id: "n-1",
  tabId: "tab-1",
  title: "Reunión con cliente",
  content: "Quedamos el martes a las 10:00",
  tags: [],
  isFavorite: false,
  favoritedAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: null,
};
const NOTE_2 = {
  id: "n-2",
  tabId: "tab-1",
  title: "Lista de compras",
  content: "leche, pan, huevos",
  tags: [],
  isFavorite: false,
  favoritedAt: null,
  createdAt: "2024-01-02T00:00:00Z",
  updatedAt: null,
};
const NOTE_3 = {
  id: "n-3",
  tabId: "tab-1",
  title: "Receta de pasta",
  content: "Hervir agua, agregar sal, etc.",
  tags: [],
  isFavorite: false,
  favoritedAt: null,
  createdAt: "2024-01-03T00:00:00Z",
  updatedAt: null,
};

vi.mock("../stores/useNoteStore", () => ({
  useNoteStore: vi.fn(),
}));

import { useNoteStore } from "../stores/useNoteStore";

/**
 * MobileSearchPage — page content for the /search route on mobile.
 *
 * The search input lives in the AppBar (rendered by MobileShell in the
 * title slot — same Y as the hamburger), NOT in the page. The page
 * reads the query from `useMobileSearchStore` and filters notes.
 *
 * To exercise the page's filter logic in isolation (without the full
 * MobileShell chrome), the test harness renders a standalone SearchBar
 * that writes to the same store. This mirrors the production wire-up
 * (AppBar's SearchBar writes to the store, page reads from it) without
 * pulling in BottomNav, SideSheet, etc.
 */
function renderSearchHarness() {
  return render(
    <MemoryRouter initialEntries={["/search"]}>
      <SearchBar
        onSearch={(q) => useMobileSearchStore.getState().setQuery(q)}
        debounceMs={0}
      />
      <MobileSearchPage />
    </MemoryRouter>,
  );
}

describe("MobileSearchPage (PR2 — shell-redesign-v1)", () => {
  beforeEach(() => {
    useMobileSearchStore.getState().resetQuery();
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [NOTE_1, NOTE_2, NOTE_3],
      filteredNotes: () => [NOTE_1, NOTE_2, NOTE_3],
      searchQuery: "",
      setSearchQuery: vi.fn(),
      fetchNotes: vi.fn().mockResolvedValue(undefined),
    } as never);
  });

  it("renders a search input with aria-label='Buscar notas'", () => {
    renderSearchHarness();
    expect(screen.getByRole("searchbox", { name: /buscar notas/i })).toBeInTheDocument();
  });

  it("initially lists all notes from the store", () => {
    renderSearchHarness();
    expect(screen.getByText(/reunión con cliente/i)).toBeInTheDocument();
    expect(screen.getByText(/lista de compras/i)).toBeInTheDocument();
    expect(screen.getByText(/receta de pasta/i)).toBeInTheDocument();
  });

  it("typing in the search bar filters notes by title (case-insensitive)", async () => {
    const user = userEvent.setup();
    renderSearchHarness();
    const input = screen.getByRole("searchbox", { name: /buscar notas/i });
    await user.type(input, "pasta");
    expect(screen.queryByText(/reunión con cliente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lista de compras/i)).not.toBeInTheDocument();
    expect(screen.getByText(/receta de pasta/i)).toBeInTheDocument();
  });

  it("typing in the search bar filters notes by content (case-insensitive)", async () => {
    const user = userEvent.setup();
    renderSearchHarness();
    const input = screen.getByRole("searchbox", { name: /buscar notas/i });
    await user.type(input, "leche");
    expect(screen.queryByText(/reunión con cliente/i)).not.toBeInTheDocument();
    expect(screen.getByText(/lista de compras/i)).toBeInTheDocument();
    expect(screen.queryByText(/receta de pasta/i)).not.toBeInTheDocument();
  });

  it("shows an empty hint when no note matches", async () => {
    const user = userEvent.setup();
    renderSearchHarness();
    const input = screen.getByRole("searchbox", { name: /buscar notas/i });
    await user.type(input, "xyz123-no-match");
    expect(screen.queryByText(/reunión con cliente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lista de compras/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/receta de pasta/i)).not.toBeInTheDocument();
    expect(screen.getByText(/sin resultados|no se encontr/i)).toBeInTheDocument();
  });

  it("does NOT call setSearchQuery on the global note store (mobile search is local)", async () => {
    const user = userEvent.setup();
    const setSearchQuery = vi.fn();
    vi.mocked(useNoteStore).mockReturnValue({
      notes: [NOTE_1, NOTE_2, NOTE_3],
      filteredNotes: () => [NOTE_1, NOTE_2, NOTE_3],
      searchQuery: "",
      setSearchQuery,
      fetchNotes: vi.fn().mockResolvedValue(undefined),
    } as never);

    renderSearchHarness();
    await user.type(screen.getByRole("searchbox", { name: /buscar notas/i }), "hola");
    expect(setSearchQuery).not.toHaveBeenCalled();
  });
});
