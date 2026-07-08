import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";
import { InfiniteScrollSentinel } from "./InfiniteScrollSentinel";

type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;

interface FakeIO {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  trigger: (isIntersecting: boolean) => void;
  root: Element | null;
}

function installIntersectionObserverMock(): {
  instances: FakeIO[];
  latest: () => FakeIO | null;
  withRoot: (root: Element | null) => FakeIO | null;
} {
  const instances: FakeIO[] = [];

  (globalThis as { IntersectionObserver: unknown }).IntersectionObserver = class {
    private cb: Callback;
    public root: Element | null;
    public observe = vi.fn();
    public disconnect = vi.fn();
    constructor(cb: Callback, opts?: { root?: Element | null }) {
      this.cb = cb;
      this.root = opts?.root ?? null;
      instances.push({
        observe: this.observe,
        disconnect: this.disconnect,
        trigger: (isIntersecting: boolean) => this.cb([{ isIntersecting }]),
        root: this.root,
      });
    }
  };

  return {
    instances,
    latest: () => instances[instances.length - 1] ?? null,
    withRoot: (root: Element | null) =>
      instances.find((i) => i.root === root) ?? null,
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

  // REGRESSION: the <ul> has overflow-y-auto, so its own scroll context is
  // separate from the viewport. The IO MUST observe against the <ul> (passed
  // as rootRef), NOT the viewport — otherwise scrolling inside the list
  // would never trigger onIntersect. This is the bug fixed in
  // `2bbe5af..HEAD` (see NoteList.tsx where listRef is now passed).
  it("uses the rootRef element as the IO root (regression: nested scroller)", () => {
    function Harness() {
      const ref = useRef<HTMLDivElement | null>(null);
      return (
        <>
          <div ref={ref} data-testid="scroller" style={{ overflowY: "auto" }} />
          <InfiniteScrollSentinel
            enabled
            onIntersect={vi.fn()}
            rootRef={ref as React.RefObject<Element | null>}
          />
        </>
      );
    }
    render(<Harness />);
    const scroller = document.querySelector('[data-testid="scroller"]')!;
    const io = mock.withRoot(scroller as Element);
    expect(io).not.toBeNull();
    // The sentinel subscribes to intersection against the SCROLLER, not
    // the viewport. When the user scrolls inside the scroller, the IO
    // fires onIntersect.
    expect(io!.root).toBe(scroller);
  });
});
