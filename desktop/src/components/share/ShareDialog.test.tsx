import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShareDialog } from "./ShareDialog";

describe("ShareDialog", () => {
  it("renders share dialog with create button when open", () => {
    render(
      <ShareDialog
        noteId="note-1"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/compartir nota/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear enlace/i })).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <ShareDialog
        noteId="note-1"
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText(/compartir nota/i)).not.toBeInTheDocument();
  });

  it("calls onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ShareDialog
        noteId="note-1"
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows expiry toggle that enables date picker", () => {
    render(
      <ShareDialog
        noteId="note-1"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const toggle = screen.getByRole("checkbox", { name: /fecha de expiración/i });
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByLabelText(/expira el/i)).toBeInTheDocument();
  });
});
