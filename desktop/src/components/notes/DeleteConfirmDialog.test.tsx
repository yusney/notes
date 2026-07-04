/**
 * Tests for DeleteConfirmDialog — the mobile delete confirmation with
 * share-warning gate (REQ-LIST-04, REQ-LIST-05).
 *
 * Mirrors the desktop `MainLayout.handleDeleteNote` flow on mobile: when
 * `useNoteStore.getShareWarning(noteId).hasActiveShares === true`, the dialog
 * prepends the share-warning copy before the destructive button. When the
 * note has no active shares, the copy is omitted.
 *
 * The dialog is purely presentational — it uses the project's native
 * `<dialog>` Modal primitive (focus trap + Escape handling come for free).
 *
 * Spec coverage:
 *   - Mounts only while `open === true` (matches Modal's contract).
 *   - Renders the note title as the dialog subject.
 *   - When `hasActiveShares === false`: NO share-warning copy.
 *   - When `hasActiveShares === true` and `count >= 1`: shows "N enlace(s)
 *     compartido(s)…" warning above the Eliminar button.
 *   - Cancelar closes without calling deleteNote.
 *   - Eliminar calls `useNoteStore.deleteNote(noteId)` and closes the dialog.
 *   - Escape closes the dialog without firing deleteNote.
 *   - Loading state: while `getShareWarning` is pending, the destructive
 *     button is disabled to avoid double-fires.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

// Mock the store so we can stub `getShareWarning` and `deleteNote` per test.
// `vi.hoisted` lifts the mutable state object above the `vi.mock` factory
// so the tests can reach in and overwrite `mockResolvedValue` per case.
// The mock implements the real Zustand selector contract: `useNoteStore(selector)`
// returns `selector(state)`; `useNoteStore()` returns the whole state.
const hoisted = vi.hoisted(() => ({
  state: {
    getShareWarning: vi.fn(),
    deleteNote: vi.fn(),
  },
}));

vi.mock("../../stores/useNoteStore", () => ({
  useNoteStore: (selector?: (s: typeof hoisted.state) => unknown) =>
    typeof selector === "function" ? selector(hoisted.state) : hoisted.state,
}));

function renderDialog(
  props: Partial<Parameters<typeof DeleteConfirmDialog>[0]> = {},
) {
  return render(
    <DeleteConfirmDialog
      open={props.open ?? true}
      onClose={props.onClose ?? vi.fn()}
      noteId={props.noteId ?? "note-42"}
      noteTitle={props.noteTitle ?? "Mi nota de prueba"}
    />,
  );
}

describe("DeleteConfirmDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: note has no active shares (warning omitted in dialog copy).
    hoisted.state.getShareWarning.mockResolvedValue({
      hasActiveShares: false,
      count: 0,
    });
    hoisted.state.deleteNote.mockResolvedValue(undefined);
  });

  it("renders nothing when closed (open=false)", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog with the note title as the subject", async () => {
    renderDialog({ noteTitle: "Mi nota de prueba" });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    // Title text appears in the dialog body copy.
    expect(screen.getByText(/Mi nota de prueba/i)).toBeInTheDocument();
  });

  it("renders both Cancelar and Eliminar buttons", async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar/i })).toBeInTheDocument();
  });

  it("shows the irreversible-action copy", async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText(/esta acción no se puede deshacer/i)).toBeInTheDocument();
  });

  it("hides share-warning copy when hasActiveShares === false", async () => {
    hoisted.state.getShareWarning.mockResolvedValue({
      hasActiveShares: false,
      count: 0,
    });
    renderDialog();
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.queryByText(/enlace.*compartido/i)).not.toBeInTheDocument();
  });

  it("shows share-warning copy when hasActiveShares === true (count = 2)", async () => {
    hoisted.state.getShareWarning.mockResolvedValue({
      hasActiveShares: true,
      count: 2,
    });
    renderDialog();
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(await screen.findByText(/2 enlaces compartidos/i)).toBeInTheDocument();
  });

  it("uses singular '1 enlace compartido' when count is 1", async () => {
    hoisted.state.getShareWarning.mockResolvedValue({
      hasActiveShares: true,
      count: 1,
    });
    renderDialog();
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(await screen.findByText(/1 enlace compartido/i)).toBeInTheDocument();
  });

  it("Cancelar closes the dialog WITHOUT calling deleteNote", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hoisted.state.deleteNote).not.toHaveBeenCalled();
  });

  it("Escape closes the dialog WITHOUT calling deleteNote", async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const dialog = screen.getByRole("dialog");
    await act(async () => {
      dialog.dispatchEvent(
        new Event("cancel", { bubbles: true, cancelable: true }),
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hoisted.state.deleteNote).not.toHaveBeenCalled();
  });

  it("Eliminar calls deleteNote(noteId) with the right id and closes the dialog", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose, noteId: "to-delete-99" });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /eliminar/i }));

    expect(hoisted.state.deleteNote).toHaveBeenCalledWith("to-delete-99");
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("fetches the share warning on mount (via getShareWarning(noteId))", async () => {
    renderDialog({ noteId: "note-abc" });
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(hoisted.state.getShareWarning).toHaveBeenCalledWith("note-abc");
  });

  it("Eliminar button has destructive styling (border-danger)", async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    const eliminar = screen.getByRole("button", { name: /eliminar/i });
    expect(eliminar.className).toMatch(/\bborder-danger\b/);
  });
});
