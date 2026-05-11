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
});
