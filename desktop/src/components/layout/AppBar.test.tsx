import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppBar } from "./AppBar";

describe("AppBar (PR1 — shell-redesign-v1)", () => {
  it("renders the title text", () => {
    render(<AppBar title="Notas" />);
    expect(screen.getByRole("heading", { level: 1, name: /notas/i })).toBeInTheDocument();
  });

  it("exposes data-testid='app-bar' as anchor for downstream tests (MobileShell, etc.)", () => {
    render(<AppBar title="Notas" />);
    expect(screen.getByTestId("app-bar")).toBeInTheDocument();
  });

  it("renders the leading slot when provided", () => {
    render(
      <AppBar
        title="Notas"
        leading={<button type="button" aria-label="Volver">←</button>}
      />,
    );
    expect(screen.getByTestId("app-bar-leading")).toBeInTheDocument();
    expect(screen.getByLabelText(/volver/i)).toBeInTheDocument();
  });

  it("renders the trailing slot when provided", () => {
    render(
      <AppBar
        title="Notas"
        trailing={<button type="button" aria-label="Menú">≡</button>}
      />,
    );
    expect(screen.getByTestId("app-bar-trailing")).toBeInTheDocument();
    expect(screen.getByLabelText(/menú/i)).toBeInTheDocument();
  });

  it("falls back to aria-label=`<title>` when no leading slot provided", () => {
    render(<AppBar title="Mi cuenta" />);
    expect(screen.getByTestId("app-bar")).toHaveAttribute("aria-label", "Mi cuenta");
  });

  it("does NOT set aria-label when leading slot is provided (leading is the label)", () => {
    render(
      <AppBar
        title="Notas"
        leading={<button type="button" aria-label="Volver">←</button>}
      />,
    );
    expect(screen.getByTestId("app-bar")).not.toHaveAttribute("aria-label");
  });

  it("applies safe-area top padding via var(--safe-top)", () => {
    render(<AppBar title="Notas" />);
    expect(screen.getByTestId("app-bar").className).toMatch(/pt-\[var\(--safe-top\)\]/);
  });

  it("is sticky, top-0, surface-elevated, with border-bottom", () => {
    render(<AppBar title="Notas" />);
    const cls = screen.getByTestId("app-bar").className;
    expect(cls).toMatch(/\bsticky\b/);
    expect(cls).toMatch(/\btop-0\b/);
    expect(cls).toMatch(/\bbg-surface-elevated\b/);
    expect(cls).toMatch(/\bborder-b\b/);
  });
});
