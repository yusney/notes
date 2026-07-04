import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { InfiniteScrollSentinel } from "./InfiniteScrollSentinel";

type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;

interface FakeIO {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  trigger: (isIntersecting: boolean) => void;
}

function installIntersectionObserverMock(): { instances: FakeIO[]; latest: () => FakeIO | null } {
  const instances: FakeIO[] = [];
  const callbacks: Callback[] = [];

  (globalThis as { IntersectionObserver: unknown }).IntersectionObserver = class {
    private cb: Callback;
    public observe = vi.fn();
    public disconnect = vi.fn();
    constructor(cb: Callback) {
      this.cb = cb;
      callbacks.push(cb);
      instances.push({
        observe: this.observe,
        disconnect: this.disconnect,
        trigger: (isIntersecting: boolean) => this.cb([{ isIntersecting }]),
      });
    }
  };

  return {
    instances,
    latest: () => instances[instances.length - 1] ?? null,
  };
}

describe("InfiniteScrollSentinel", () => {
  let mock: ReturnType<typeof installIntersectionObserverMock>;

  beforeEach(() => {
    mock = installIntersectionObserverMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mounts a sentinel div with the correct testid", () => {
    const { getByTestId } = render(
      <InfiniteScrollSentinel enabled onIntersect={vi.fn()} />,
    );
    expect(getByTestId("infinite-scroll-sentinel")).toBeInTheDocument();
  });

  it("does NOT call onIntersect when enabled is false even if intersection fires", () => {
    const onIntersect = vi.fn();
    render(<InfiniteScrollSentinel enabled={false} onIntersect={onIntersect} />);
    // No IO should be created when disabled — latest() returns null.
    expect(mock.latest()).toBeNull();
  });

  it("calls onIntersect when the sentinel intersects the viewport (enabled)", () => {
    const onIntersect = vi.fn();
    render(<InfiniteScrollSentinel enabled onIntersect={onIntersect} />);
    const io = mock.latest();
    expect(io).not.toBeNull();
    io!.trigger(true);
    expect(onIntersect).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onIntersect when isIntersecting is false", () => {
    const onIntersect = vi.fn();
    render(<InfiniteScrollSentinel enabled onIntersect={onIntersect} />);
    const io = mock.latest();
    expect(io).not.toBeNull();
    io!.trigger(false);
    expect(onIntersect).not.toHaveBeenCalled();
  });

  it("uses the latest callback when the parent re-renders with a new closure", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <InfiniteScrollSentinel enabled onIntersect={first} />,
    );
    rerender(<InfiniteScrollSentinel enabled onIntersect={second} />);
    // The original IO instance keeps observing; we trigger and the LATEST
    // ref-shadowed callback should fire.
    const io = mock.latest()!;
    io.trigger(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(
      <InfiniteScrollSentinel enabled onIntersect={vi.fn()} />,
    );
    const io = mock.latest()!;
    unmount();
    expect(io.disconnect).toHaveBeenCalled();
  });
});
