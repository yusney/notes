/**
 * Race a promise against a timeout. If the original doesn't settle before
 * `ms` elapses, the returned promise rejects with a `TimeoutError` and the
 * abortable signal (if provided) is triggered so the underlying request can
 * clean up.
 *
 * Use case: without this, `fetch()` against a slow/dead backend hangs
 * indefinitely on the UI, blocking spinner-only screens
 * (SettingsPage → "Cargando…", NewNotePage → "Creando nota…") forever.
 * The browser default request timeout is 5–30 s depending on environment,
 * but we want a deterministic user-visible cutoff at 5 s.
 */
export class TimeoutError extends Error {
  constructor(public readonly ms: number, message?: string) {
    super(message ?? `Operation timed out after ${ms} ms`);
    this.name = "TimeoutError";
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 5000,
  signal?: AbortSignal
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      // Best-effort cancel of the underlying operation. We don't depend
      // on the signal — the TimeoutError rejection is what unblocks the
      // caller — but aborting early lets fetches free their body sockets
      // sooner if the runtime exposes `abort()`.
      try {
        signal?.dispatchEvent?.(new Event("abort"));
      } catch {
        // ignore — older TS lib defs don't expose AbortSignal.abort();
        // the call sites only care about the resolved timeout below.
      }
      reject(new TimeoutError(ms));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
