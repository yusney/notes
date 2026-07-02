import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "./Modal";

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  return render(
    <Modal
      open={props.open ?? true}
      onClose={props.onClose ?? vi.fn()}
      title={props.title ?? "Test Modal"}
    >
      <div>Modal content</div>
    </Modal>
  );
}

describe("Modal", () => {
  it("renders children when open", () => {
    renderModal();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("renders title", () => {
    renderModal({ title: "My Title" });
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderModal({ open: false });
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("has role=dialog", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has aria-modal=true", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose });

    // Click on the overlay (outside the dialog container)
    const overlay = screen.getByRole("dialog").parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when dialog container is clicked", () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose });

    // Click inside the dialog (not on a button)
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });
});
