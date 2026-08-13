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

  // ── REQ-LAY-02 — safe-area-inset-bottom ──────────────────────────────────
  //
  // jsdom cannot resolve `env(safe-area-inset-bottom)` (CSS env() values
  // are computed at layout time, not parse time), so we assert the
  // CONTRACT at the source level: the Tailwind arbitrary class must be
  // present on the rendered button so the compiled CSS includes the
  // `bottom: env(safe-area-inset-bottom)` (or equivalent) rule at
  // runtime.

  it("applies env(safe-area-inset-bottom) via Tailwind arbitrary class (REQ-LAY-02)", () => {
    render(<FloatingActionButton aria-label="Crear nota" onClick={() => {}} />);
    const button = screen.getByRole("button", { name: "Crear nota" });

    // The Tailwind arbitrary class for env() safe-area-inset-bottom.
    // We accept any of the common spellings that satisfy the contract:
    //   - bottom-[calc(env(safe-area-inset-bottom)+1rem)]
    //   - pb-[env(safe-area-inset-bottom)]
    //   - mb-[env(safe-area-inset-bottom)]
    // The PR2 implementation picks the canonical one (see FAB source).
    expect(button.className).toMatch(/env\(safe-area-inset-bottom\)/);
  });

  it("index.html declares viewport-fit=cover so env() resolves on iOS/Android", () => {
    // RED: fails until the viewport meta is updated.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const htmlPath = path.resolve(__dirname, "../../../index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    // The viewport meta tag must include `viewport-fit=cover` for
    // `env(safe-area-inset-bottom)` to resolve to a non-zero value on
    // devices with a gesture bar / home indicator. Without it, the env
    // always evaluates to 0 and the FAB sits flush to the bottom edge.
    const viewportMatch = html.match(/<meta\s+name=["']viewport["']\s+content=["']([^"']+)["']/i);
    expect(viewportMatch, "missing viewport meta tag in index.html").not.toBeNull();
    expect(viewportMatch![1]).toMatch(/viewport-fit\s*=\s*cover/i);
  });
});
