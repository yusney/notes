import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  value: string;
  onSave: (value: string) => Promise<void>;
  delay?: number;
}

export function useAutoSave({
  value,
  onSave,
  delay = 1500,
}: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const isFirstRender = useRef(true);
  const latestValue = useRef(value);
  const latestOnSave = useRef(onSave);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  useEffect(() => {
    latestOnSave.current = onSave;
  }, [onSave]);

  /**
   * Flush any pending debounced save immediately. Cancels the scheduled
   * timer (if any) so we never double-fire. Returns the in-flight save
   * promise so callers can await the result.
   *
   * Used by the mobile editor to commit pending changes on:
   *   - component unmount (route change, tab close)
   *   - `document.visibilitychange` → "hidden" (app backgrounded)
   */
  const save = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus("saving");
    try {
      await latestOnSave.current(latestValue.current);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // eslint-disable-next-line react-doctor/no-adjust-state-on-prop-change -- debounce pattern: status must reset to "pending" when value/delay changes
    setStatus("pending");

    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      setStatus("saving");
      try {
        await latestOnSave.current(latestValue.current);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, delay]);

  return { status, save };
}
