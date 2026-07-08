import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { EditorSkeleton } from "./EditorSkeleton";

/**
 * EditorSkeleton (REQ-PERF-06)
 *
 * Fixed-height placeholder rendered inside the MainLayout editor pane
 * while the lazy NoteEditor / NoteViewer chunk is resolving. Mirrors
 * the empty-state container's outer div (h-full + bg-surface) so the
 * CLS delta on resolve is zero.
 */

describe("EditorSkeleton (REQ-PERF-06)", () => {
  it("renders with role=status and bg-surface class for accessibility + CLS parity", () => {
    const { container } = render(<EditorSkeleton />);

    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status!.className).toMatch(/\bbg-surface\b/);
    // h-full is required so the skeleton fills the <main> container
    // (matches the empty-state container — zero CLS on resolve).
    expect(status!.className).toMatch(/\bh-full\b/);
  });
});
