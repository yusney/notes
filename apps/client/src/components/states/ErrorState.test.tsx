import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "./ErrorState";

describe("ErrorState (S2)", () => {
  it("renders the error copy 'No pudimos cargar tus notas'", () => {
    render(<ErrorState onRetry={vi.fn()} />);

    expect(screen.getByText(/no pudimos cargar tus notas/i)).toBeInTheDocument();
  });

  it("renders a 'Reintentar' button that calls onRetry on click", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    const retry = screen.getByRole("button", { name: /reintentar/i });
    expect(retry).toBeInTheDocument();

    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders an alert role for assistive tech", () => {
    render(<ErrorState onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});