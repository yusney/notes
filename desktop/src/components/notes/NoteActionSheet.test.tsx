/**
 * Tests for NoteActionSheet — the mobile long-press context menu.
 *
 * Closes the action flow opened by REQ-LIST-03 in `mobile-note-list-polish`.
 * Wraps the project's native-`<dialog>` Modal primitive (same pattern as
 * MoveToTabMenu), so we get focus trap + Escape handling for free.
 *
 * Spec coverage:
 *   - Renders dialog only when open=true (mounted while open; null while closed).
 *   - Shows the note title as the dialog subject.
 *   - Lists every action passed via `actions` prop with `data-testid` hooks
 *     and 44x44px touch targets.
 *   - Tapping an action button invokes `onAction(kind)` and closes the sheet.
 *   - Escape closes (native `<dialog>` cancel) WITHOUT firing any action.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteActionSheet } from "./NoteActionSheet";

const ACTIONS = [
  { kind: "delete", label: "Eliminar", icon: "🗑" },
];

function renderSheet(
  props: Partial<Parameters<typeof NoteActionSheet>[0]> = {},
) {
  return render(
    <NoteActionSheet
      open={props.open ?? true}
      onClose={props.onClose ?? vi.fn()}
      noteTitle={props.noteTitle ?? "My Test Note"}
      actions={props.actions ?? ACTIONS}
      onAction={props.onAction ?? vi.fn()}
    />,
  );
}

describe("NoteActionSheet", () => {
  it("renders nothing when closed (open=false)", () => {
    renderSheet({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog with the note title visible", async () => {
    renderSheet({ noteTitle: "My Test Note" });
    await act(async () => {});
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("My Test Note")).toBeInTheDocument();
  });

  it("renders one button per action with the right label and test id", async () => {
    renderSheet();
    await act(async () => {});

    const btn = screen.getByTestId("note-action-sheet-option-delete");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent(/eliminar/i);
  });

  it("renders each action with at least 44x44px touch targets (min-h-11 min-w-11)", async () => {
    renderSheet();
    await act(async () => {});

    const btn = screen.getByTestId("note-action-sheet-option-delete");
    expect(btn.className).toMatch(/\bmin-h-11\b/);
    expect(btn.className).toMatch(/\bmin-w-11\b/);
  });

  it("tapping an action button calls onAction(kind) exactly once", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderSheet({ onAction });
    await act(async () => {});

    await user.click(screen.getByTestId("note-action-sheet-option-delete"));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith("delete");
  });

  it("tapping an action button also closes the sheet (calls onClose)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSheet({ onClose });
    await act(async () => {});

    await user.click(screen.getByTestId("note-action-sheet-option-delete"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape closes the sheet without firing onAction", async () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    renderSheet({ onAction, onClose });
    await act(async () => {});

    const dialog = screen.getByRole("dialog");
    await act(async () => {
      dialog.dispatchEvent(
        new Event("cancel", { bubbles: true, cancelable: true }),
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("renders multiple actions when more are passed", async () => {
    renderSheet({
      actions: [
        { kind: "delete", label: "Eliminar", icon: "🗑" },
        { kind: "share", label: "Compartir", icon: "🔗" },
      ],
    });
    await act(async () => {});

    expect(
      screen.getByTestId("note-action-sheet-option-delete"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("note-action-sheet-option-share"),
    ).toBeInTheDocument();
    expect(screen.getByText(/compartir/i)).toBeInTheDocument();
  });
});
