import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FloatingActionButton } from "./FloatingActionButton";

describe("FloatingActionButton", () => {
  it("renders with the given aria-label", () => {
    render(<FloatingActionButton aria-label="Crear nota" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Crear nota" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<FloatingActionButton aria-label="Crear nota" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Crear nota" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders the plus icon by default", () => {
    render(<FloatingActionButton aria-label="New" onClick={() => {}} />);
    const button = screen.getByRole("button", { name: "New" });
    expect(button.textContent).toContain("+");
  });

  it("renders custom icon when provided", () => {
    render(<FloatingActionButton aria-label="Export" onClick={() => {}} icon="⬇" />);
    const button = screen.getByRole("button", { name: "Export" });
    expect(button.textContent).toContain("⬇");
  });
});
