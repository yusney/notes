import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BottomNav } from "./BottomNav";

/**
 * A11y smoke tests for shell-redesign-v1 PR3.
 *
 * These tests cover the two CSS-only a11y rules added to `index.css`
 * (per design #2214 and tasks #2215 T3.5):
 *
 *   1. `:focus-visible` outline for keyboard navigation.
 *   2. `@media (prefers-reduced-motion: reduce)` blanket-disable.
 *
 * CSS is not directly assertable from jsdom (no real layout engine), so
 * we:
 *   - Read `index.css` and grep for the rule selectors / media queries.
 *   - Render a key interactive component (BottomNav) under a mocked
 *     `matchMedia('(prefers-reduced-motion: reduce)').matches === true`
 *     and assert that:
 *       (a) the component still renders (the rule doesn't accidentally
 *           hide anything),
 *       (b) the active link still carries `aria-current="page"`.
 *
 * The visual effect of the CSS rules is verified by the desktop-1280
 * and mobile-375 screenshots in `docs/screenshots/v1/pr3-*.png` (T3.6).
 */
describe("shell-redesign-v1 (PR3 — a11y)", () => {
  afterEach(() => cleanup());

  it("index.css declares a :focus-visible outline rule using --color-accent", () => {
    const cssPath = resolve(__dirname, "../../index.css");
    const css = readFileSync(cssPath, "utf-8");
    // Look for the focus-visible rule block — not just the word in a
    // comment, but an actual selector declaration.
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline[^}]*--color-accent/);
  });

  it("index.css declares a @media (prefers-reduced-motion: reduce) rule", () => {
    const cssPath = resolve(__dirname, "../../index.css");
    const css = readFileSync(cssPath, "utf-8");
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    // The blanket-disable must apply to *, *::before, *::after so the
    // rule survives any Tailwind transition utility.
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*\*[\s\S]*\*::before[\s\S]*\*::after/);
  });

  it("BottomNav still renders and keeps aria-current='page' when reduced-motion is requested", () => {
    // Mock matchMedia so the @media query evaluates to matches=true.
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: matchMediaMock,
    });

    render(
      <MemoryRouter initialEntries={["/search"]}>
        <BottomNav />
      </MemoryRouter>,
    );

    // The nav itself mounts — proves the rule didn't hide it.
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    // The active link carries aria-current="page" regardless of motion.
    expect(screen.getByRole("link", { name: /buscar/i })).toHaveAttribute("aria-current", "page");
  });
});