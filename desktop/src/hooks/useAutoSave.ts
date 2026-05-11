import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  useEffect(() => {
    latestOnSave.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setStatus("pending");

    const timer = setTimeout(async () => {
      setStatus("saving");
      try {
        await latestOnSave.current(latestValue.current);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return { status };
}
