import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MainLayout } from "./MainLayout";
import { useAuthStore } from "../stores/useAuthStore";

vi.mock("../stores/useNoteStore", () => {
  const mockState = {
    tabs: [],
    activeTabId: null,
    activeNoteId: null,
    fetchTabs: vi.fn(),
    fetchNotes: vi.fn(),
    createTab: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    getShareWarning: vi.fn(),
    exportNotes: vi.fn(),
    setActiveTab: vi.fn(),
    setActiveNote: vi.fn(),
    setSearchQuery: vi.fn(),
    filteredNotes: vi.fn().mockReturnValue([]),
    searchQuery: "",
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => typeof mockState; setState: (partial: Partial<typeof mockState>) => void }).getState = () => mockState;
  (hook as unknown as { setState: (partial: Partial<typeof mockState>) => void }).setState = (partial: Partial<typeof mockState>) => Object.assign(mockState, partial);
  return { useNoteStore: hook };
});

vi.mock("../stores/useAuthStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("../stores/useTagStore", () => {
  const mockState = {
    tags: [],
    fetchTags: vi.fn(),
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => typeof mockState }).getState = () => mockState;
  return { useTagStore: hook };
});

vi.mock("../stores/usePreferencesStore", () => {
  const mockState = {
    sortBy: "creation",
    sortOrder: "desc",
    theme: "dark",
    fetchPreferences: vi.fn().mockResolvedValue(undefined),
  };
  const hook = vi.fn(() => mockState);
  (hook as unknown as { getState: () => typeof mockState }).getState = () => mockState;
  return { usePreferencesStore: hook };
});

vi.mock("../components/layout/Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("../components/notes/NoteList", () => ({
  NoteList: () => <div data-testid="note-list" />,
}));

vi.mock("../components/notes/SearchBar", () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));

vi.mock("../components/share/ShareWarningDialog", () => ({
  ShareWarningDialog: () => null,
}));

describe("MainLayout", () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({ user: { name: "Test" }, logout: vi.fn() } as never);
  });

  it("renders the FAB button", () => {
    render(<MainLayout />);
    expect(screen.getByRole("button", { name: /crear nota|new note/i })).toBeInTheDocument();
  });

  it("renders the sidebar, note list and search bar", () => {
    render(<MainLayout />);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("note-list")).toBeInTheDocument();
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });
});
