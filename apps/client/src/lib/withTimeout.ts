/**
 * Race a promise against a timeout. If the original doesn't settle before
 * `ms` elapses, the returned promise rejects with a `TimeoutError`.
 *
 * This is a PURE RACE — it does NOT abort the underlying operation. The
 * original promise continues to settle (or leak) on its own. If you need
 * real cancellation, pair this with your own `AbortController`:
 *
 *   const ctrl = new AbortController();
 *   try {
 *     const result = await withTimeout(fetch(url, { signal: ctrl.signal }), 5000);
 *   } catch (e) {
 *     if (e instanceof TimeoutError) ctrl.abort();
 *     throw e;
 *   }
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
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(ms));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
