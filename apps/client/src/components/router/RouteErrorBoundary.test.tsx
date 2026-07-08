import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

/**
 * RouteErrorBoundary (REQ-PERF-02)
 *
 * Class component that catches thrown errors in lazy route chunks and
 * surfaces a recoverable error UI with a retry button. Must not replace
 * the global app shell — only the lazy subtree it wraps.
 */

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Chunk load failed");
  return <div>children rendered</div>;
}

describe("RouteErrorBoundary (REQ-PERF-02)", () => {
  // Silence React's noisy "uncaught error" log for the boundary test.
  // vitest doesn't auto-suppress these — without this the test output
  // is polluted but the test still passes.
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders children when no error is thrown", () => {
    render(
      <RouteErrorBoundary>
        <Bomb shouldThrow={false} />
      </RouteErrorBoundary>
    );

    expect(screen.getByText("children rendered")).toBeInTheDocument();
  });

  it("catches an error thrown by children and renders the error UI", () => {
    render(
      <RouteErrorBoundary>
        <Bomb shouldThrow={true} />
      </RouteErrorBoundary>
    );

    expect(screen.queryByText("children rendered")).not.toBeInTheDocument();
    // The boundary should expose a retry control (button or link).
    const retry = screen.getByRole("button", { name: /reintentar|retry|reintento/i });
    expect(retry).toBeInTheDocument();
  });

  it("retry button resets error state and re-renders children", () => {
    // Use a let-bound shouldThrow so we can flip it after retry.
    let shouldThrow = true;

    function Toggleable() {
      if (shouldThrow) throw new Error("Chunk load failed");
      return <div>children rendered</div>;
    }

    render(
      <RouteErrorBoundary>
        <Toggleable />
      </RouteErrorBoundary>
    );

    // Initial render: error UI shown.
    expect(screen.queryByText("children rendered")).not.toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /reintentar|retry|reintento/i });
    expect(retry).toBeInTheDocument();

    // Flip the condition so the child can render successfully.
    shouldThrow = false;
    fireEvent.click(retry);

    // Children should now mount.
    expect(screen.getByText("children rendered")).toBeInTheDocument();
  });
});
