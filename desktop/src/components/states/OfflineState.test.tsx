import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineState } from "./OfflineState";

describe("OfflineState (S3)", () => {
  it("renders the offline copy 'Sin conexión'", () => {
    render(<OfflineState />);
    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });

  it("renders a yellow banner (uses accent-subtle or warning-colored classes)", () => {
    const { container } = render(<OfflineState />);
    // The banner must visually distinguish from a regular error — yellow/warning.
    // We assert that the banner has a yellow-adjacent Tailwind class.
    const banner = container.querySelector('[data-testid="offline-state"]') as HTMLElement;
    expect(banner).not.toBeNull();
    // Yellow classes from the project's palette: bg-accent-subtle (warm yellow),
    // border-accent, or text-accent.
    const cls = banner.className;
    const matchesYellow =
      /\bbg-accent-subtle\b/.test(cls) ||
      /\bborder-accent\b/.test(cls) ||
      /\btext-accent\b/.test(cls);
    expect(matchesYellow).toBe(true);
  });

  it("renders a status role for assistive tech (polite announcement)", () => {
    render(<OfflineState />);
    // A polite live region so screen readers announce the offline state
    // without interrupting other narration.
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});