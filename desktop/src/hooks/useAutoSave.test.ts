import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "./useAutoSave";

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with idle status", () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ value: "initial", onSave: saveFn, delay: 1500 })
    );

    expect(result.current.status).toBe("idle");
  });

  it("sets status to 'saving' after debounce delay", async () => {
    const saveFn = vi.fn().mockImplementation(
      () => new Promise((r) => setTimeout(r, 100))
    );

    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useAutoSave({ value, onSave: saveFn, delay: 1500 }),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "hello world" });

    expect(result.current.status).toBe("pending");

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.status).toBe("saving");
  });

  it("sets status to 'saved' after save completes", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useAutoSave({ value, onSave: saveFn, delay: 1500 }),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "hello world" });

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(saveFn).toHaveBeenCalledWith("hello world");
    expect(result.current.status).toBe("saved");
  });

  it("does NOT call save before 1500ms debounce", () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ value }: { value: string }) =>
        useAutoSave({ value, onSave: saveFn, delay: 1500 }),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "he" });
    vi.advanceTimersByTime(500);
    rerender({ value: "hel" });
    vi.advanceTimersByTime(500);

    expect(saveFn).not.toHaveBeenCalled();
  });

  it("sets status to 'error' when save throws", async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useAutoSave({ value, onSave: saveFn, delay: 1500 }),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "hello world" });

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(result.current.status).toBe("error");
  });

  // ── mobile-note-edit (REQ-EDIT-08): expose save() for flush-on-unmount
  // and visibility-change scenarios. The debounce arm must be cancelled
  // when save() is called so the flush is single-fire. ────────────────────

  it("exposes a save() function on the hook return value", () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ value: "initial", onSave: saveFn, delay: 1500 })
    );

    expect(typeof result.current.save).toBe("function");
  });

  it("save() cancels the pending debounce timer and immediately invokes onSave with the latest value", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useAutoSave({ value, onSave: saveFn, delay: 1500 }),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "hello world" });

    // Move forward 500ms (still inside the 1500ms debounce window)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Call save() — must invoke onSave synchronously (not after 1500ms)
    await act(async () => {
      await result.current.save();
    });

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith("hello world");
  });

  it("save() does not double-fire if the debounce timer would have fired in the same window", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useAutoSave({ value, onSave: saveFn, delay: 1500 }),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "hello world" });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await result.current.save();
      // Advance past the original 1500ms mark
      vi.advanceTimersByTime(2000);
    });

    // save() should have cancelled the pending timer — only one invocation
    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  it("save() transitions status to 'saved' on success", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useAutoSave({ value, onSave: saveFn, delay: 1500 }),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "hello world" });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.status).toBe("saved");
  });

  it("save() transitions status to 'error' when onSave rejects", async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useAutoSave({ value, onSave: saveFn, delay: 1500 }),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "hello world" });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.status).toBe("error");
  });
});
