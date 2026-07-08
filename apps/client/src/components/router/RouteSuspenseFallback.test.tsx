import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteSuspenseFallback } from "./RouteSuspenseFallback";

/**
 * RouteSuspenseFallback (REQ-PERF-02)
 *
 * Shared fallback component rendered inside <Suspense> while a lazy
 * route chunk is loading. Provides a stable role="status" region for
 * accessibility + a configurable minHeight prop so the caller can
 * match the route's first-paint height (zero CLS).
 */

describe("RouteSuspenseFallback (REQ-PERF-02)", () => {
  it("renders a role=status region with default minHeight 50vh", () => {
    render(<RouteSuspenseFallback />);

    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    // The minHeight is applied via inline style on the same node.
    expect((status as HTMLElement).style.minHeight).toBe("50vh");
  });

  it("respects custom minHeight prop", () => {
    render(<RouteSuspenseFallback minHeight="100vh" />);

    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect((status as HTMLElement).style.minHeight).toBe("100vh");
  });
});
