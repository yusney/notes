import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShareWarningDialog } from "./ShareWarningDialog";

describe("ShareWarningDialog", () => {
  it("renders warning with active share count when open", () => {
    render(
      <ShareWarningDialog
        isOpen={true}
        activeShareCount={3}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/enlaces activos/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <ShareWarningDialog
        isOpen={false}
        activeShareCount={2}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByText(/enlaces activos/i)).not.toBeInTheDocument();
  });

  it("calls onConfirm when delete button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ShareWarningDialog
        isOpen={true}
        activeShareCount={1}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /eliminar de todas formas/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <ShareWarningDialog
        isOpen={true}
        activeShareCount={1}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
