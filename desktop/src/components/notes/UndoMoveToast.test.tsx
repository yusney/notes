/**
 * Tests for UndoMoveToast — covers CRITICAL 2 (undo failure feedback) plus
 * the R3 WARNING about aria-live / unmount lifecycle.
 *
 * Spec coverage:
 *   - Renders the success message ("Nota movida a {destTabName}") and an
 *     undo action when the store's `lastMove` is set.
 *   - Exposes role="status" + aria-live="polite" so screen readers announce it.
 *   - Clicking "Deshacer" calls `moveNoteToTab(noteId, sourceTabId)`.
 *   - An undo PUT failure surfaces "No se pudo deshacer el movimiento" in
 *     the toast and does NOT cascade a fresh success toast.
 *   - Auto-dismisses after 5s.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UndoMoveToast } from "./UndoMoveToast";
import { useNoteStore } from "../../stores/useNoteStore";
import type { Note, Tab } from "../../types";

vi.mock("../../api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "../../api/client";

const mockTabs: Tab[] = [
  { id: "tab-A", name: "Source", userId: "u1", createdAt: "", updatedAt: "" },
  { id: "tab-B", name: "Destination", userId: "u1", createdAt: "", updatedAt: "" },
];

const mockNote: Note = {
  id: "note-1",
  title: "Hello",
  content: "Content",
  tabId: "tab-A",
  userId: "u1",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  tags: [],
};

beforeEach(() => {
  useNoteStore.setState({
    tabs: mockTabs,
    notes: [mockNote],
    visibleNoteIds: ["note-1"],
    activeTabId: "tab-A",
    activeNoteId: null,
    searchQuery: "",
    selectedTagIds: [],
    sortBy: "creation",
    sortOrder: "desc",
    isFavoriteOnly: false,
    isLoading: false,
    error: null,
    page: 1,
    pageSize: 10,
    totalCount: 1,
    totalPages: 1,
    lastMove: null,
  });
  vi.clearAllMocks();
  (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
  });
});

describe("UndoMoveToast", () => {
  it("renders 'Nota movida a {destTabName}' + 'Deshacer' when lastMove is set, with aria-live", () => {
    useNoteStore.setState({
      lastMove: { noteId: "note-1", sourceTabId: "tab-A", destTabName: "Destination" },
    });

    render(<UndoMoveToast />);

    const toast = screen.getByTestId("undo-move-toast");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute("role", "status");
    expect(toast).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText(/nota movida a/i)).toBeInTheDocument();
    expect(screen.getByText("Destination")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deshacer/i })).toBeInTheDocument();
  });

  it("renders nothing when lastMove is null", () => {
    render(<UndoMoveToast />);
    expect(screen.queryByTestId("undo-move-toast")).not.toBeInTheDocument();
  });

  it("clicking 'Deshacer' calls moveNoteToTab(noteId, sourceTabId)", async () => {
    useNoteStore.setState({
      lastMove: { noteId: "note-1", sourceTabId: "tab-A", destTabName: "Destination" },
      notes: [{ ...mockNote, tabId: "tab-B" }], // after a successful first move, note is in B
    });

    render(<UndoMoveToast />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /deshacer/i }));
    });

    expect(apiClient.put).toHaveBeenCalledWith("/api/notes/note-1/tab", { tabId: "tab-A" });
  });

  it("undo PUT failure shows 'No se pudo deshacer el movimiento' in the toast and does NOT cascade a success toast", async () => {
    useNoteStore.setState({
      lastMove: { noteId: "note-1", sourceTabId: "tab-A", destTabName: "Destination" },
    });
    (apiClient.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("404"));

    render(<UndoMoveToast />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /deshacer/i }));
    });

    // Error feedback must be visible in the toast itself.
    expect(screen.getByText(/no se pudo deshacer el movimiento/i)).toBeInTheDocument();
    expect(screen.getByText(/no se pudo deshacer el movimiento/i)).toHaveAttribute("role", "alert");

    // lastMove was cleared by the toast on click and must NOT be re-set
    // (the store rejects on PUT failure and does NOT commit a new lastMove).
    expect(useNoteStore.getState().lastMove).toBeNull();
  });

  it("auto-dismisses the success toast after 5 seconds", () => {
    vi.useFakeTimers();
    try {
      useNoteStore.setState({
        lastMove: { noteId: "note-1", sourceTabId: "tab-A", destTabName: "Destination" },
      });

      render(<UndoMoveToast />);
      expect(screen.getByTestId("undo-move-toast")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByTestId("undo-move-toast")).not.toBeInTheDocument();
      expect(useNoteStore.getState().lastMove).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
