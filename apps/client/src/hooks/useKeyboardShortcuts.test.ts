import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function fireKeydown(key: string, ctrlKey = true, shiftKey = false, target?: EventTarget) {
  const event = new KeyboardEvent("keydown", {
    key,
    ctrlKey,
    shiftKey,
    bubbles: true,
  });
  if (target) {
    Object.defineProperty(event, "target", { value: target, writable: false });
  }
  document.dispatchEvent(event);
}

describe("useKeyboardShortcuts", () => {
  const callbacks = {
    onCreateNote: vi.fn(),
    onSave: vi.fn(),
    onFocusSearch: vi.fn(),
    onExport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onCreateNote when Ctrl+N is pressed outside input", () => {
    renderHook(() => useKeyboardShortcuts(callbacks));
    fireKeydown("n");
    expect(callbacks.onCreateNote).toHaveBeenCalledOnce();
  });

  it("calls onSave when Ctrl+S is pressed", () => {
    renderHook(() => useKeyboardShortcuts(callbacks));
    fireKeydown("s");
    expect(callbacks.onSave).toHaveBeenCalledOnce();
  });

  it("calls onFocusSearch when Ctrl+K is pressed", () => {
    renderHook(() => useKeyboardShortcuts(callbacks));
    fireKeydown("k");
    expect(callbacks.onFocusSearch).toHaveBeenCalledOnce();
  });

  it("calls onExport when Ctrl+Shift+E is pressed", () => {
    renderHook(() => useKeyboardShortcuts(callbacks));
    fireKeydown("e", true, true);
    expect(callbacks.onExport).toHaveBeenCalledOnce();
  });

  it("ignores shortcuts when target is an input", () => {
    renderHook(() => useKeyboardShortcuts(callbacks));
    const input = document.createElement("input");
    const event = new KeyboardEvent("keydown", { key: "n", ctrlKey: true, bubbles: true });
    Object.defineProperty(event, "target", { value: input, writable: false });
    document.dispatchEvent(event);
    expect(callbacks.onCreateNote).not.toHaveBeenCalled();
  });

  it("ignores shortcuts when target is a textarea", () => {
    renderHook(() => useKeyboardShortcuts(callbacks));
    const textarea = document.createElement("textarea");
    const event = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true });
    Object.defineProperty(event, "target", { value: textarea, writable: false });
    document.dispatchEvent(event);
    expect(callbacks.onSave).not.toHaveBeenCalled();
  });

  it("cleans up event listener on unmount", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderHook(() => useKeyboardShortcuts(callbacks));
    expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
