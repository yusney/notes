import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateTabDialog } from "./CreateTabDialog";

describe("CreateTabDialog", () => {
  it("renders with title and input when open", () => {
    render(
      <CreateTabDialog
        open={true}
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(screen.getByText(/nombre del nuevo espacio/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <CreateTabDialog
        open={false}
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("calls onClose when Cancelar button is clicked", () => {
    const onClose = vi.fn();
    render(
      <CreateTabDialog
        open={true}
        onClose={onClose}
        onCreate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onCreate with trimmed name when Creá button is clicked and name is valid", () => {
    const onCreate = vi.fn();
    render(
      <CreateTabDialog
        open={true}
        onClose={vi.fn()}
        onCreate={onCreate}
      />
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  My New Tab  " } });
    fireEvent.click(screen.getByRole("button", { name: /creá/i }));
    expect(onCreate).toHaveBeenCalledWith("My New Tab");
  });

  it("shows error when name is empty and Creá is clicked", () => {
    const onCreate = vi.fn();
    render(
      <CreateTabDialog
        open={true}
        onClose={vi.fn()}
        onCreate={onCreate}
      />
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /creá/i }));

    expect(screen.getByText(/el nombre no puede estar vacío/i)).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("shows error when name exceeds 50 characters", () => {
    const onCreate = vi.fn();
    render(
      <CreateTabDialog
        open={true}
        onClose={vi.fn()}
        onCreate={onCreate}
      />
    );

    const longName = "a".repeat(51);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: longName } });
    fireEvent.click(screen.getByRole("button", { name: /creá/i }));

    expect(screen.getByText(/no puede exceder los 50 caracteres/i)).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("clears error when user starts typing again", () => {
    render(
      <CreateTabDialog
        open={true}
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    // Trigger empty error
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /creá/i }));
    expect(screen.getByText(/el nombre no puede estar vacío/i)).toBeInTheDocument();

    // Start typing
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a" } });
    expect(screen.queryByText(/el nombre no puede estar vacío/i)).not.toBeInTheDocument();
  });

  it("accepts exactly 50 character name", () => {
    const onCreate = vi.fn();
    render(
      <CreateTabDialog
        open={true}
        onClose={vi.fn()}
        onCreate={onCreate}
      />
    );

    const exactName = "a".repeat(50);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: exactName } });
    fireEvent.click(screen.getByRole("button", { name: /creá/i }));

    expect(onCreate).toHaveBeenCalledWith(exactName);
    expect(screen.queryByText(/no puede exceder los 50 caracteres/i)).not.toBeInTheDocument();
  });

  it("calls onCreate on Enter key in input", () => {
    const onCreate = vi.fn();
    render(
      <CreateTabDialog
        open={true}
        onClose={vi.fn()}
        onCreate={onCreate}
      />
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Tab Name" } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onCreate).toHaveBeenCalledWith("Tab Name");
  });
});
