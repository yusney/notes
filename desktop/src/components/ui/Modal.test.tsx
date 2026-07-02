import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Modal } from "./Modal";

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  return render(
    <Modal
      open={props.open ?? true}
      onClose={props.onClose ?? vi.fn()}
      title={props.title ?? "Test Modal"}
      closeOnEscape={props.closeOnEscape}
    >
      <div>Modal content</div>
    </Modal>
  );
}

describe("Modal", () => {
  it("renders children when open", async () => {
    renderModal();
    await act(async () => {});
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("renders title", async () => {
    renderModal({ title: "My Title" });
    await act(async () => {});
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("is hidden when closed", async () => {
    renderModal({ open: false });
    await act(async () => {});
    expect(screen.queryByText("Modal content")).not.toBeVisible();
  });

  it("exposes a dialog role", async () => {
    renderModal();
    await act(async () => {});
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onClose when Escape fires the native cancel event", async () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose });
    await act(async () => {});

    const dialog = screen.getByRole("dialog");
    await act(async () => {
      dialog.dispatchEvent(
        new Event("cancel", { bubbles: true, cancelable: true })
      );
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose on Escape when closeOnEscape is false", async () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose, closeOnEscape: false });
    await act(async () => {});

    const dialog = screen.getByRole("dialog");
    await act(async () => {
      dialog.dispatchEvent(
        new Event("cancel", { bubbles: true, cancelable: true })
      );
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
