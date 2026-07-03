import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState (S1)", () => {
  it("renders the empty-state copy 'Aún no tienes notas'", () => {
    render(<EmptyState onCreate={vi.fn()} />);

    expect(screen.getByText(/aún no tienes notas/i)).toBeInTheDocument();
  });

  it("renders a CTA 'Crear desde desktop' that calls onCreate on click", () => {
    const onCreate = vi.fn();
    render(<EmptyState onCreate={onCreate} />);

    const cta = screen.getByRole("button", { name: /crear desde desktop/i });
    expect(cta).toBeInTheDocument();

    fireEvent.click(cta);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("renders an illustration glyph or placeholder (non-text aria-hidden span)", () => {
    // Visual affordance — a styled placeholder that screen readers ignore.
    const { container } = render(<EmptyState onCreate={vi.fn()} />);
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
  });
});