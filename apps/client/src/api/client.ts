export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface ApiClientOptions {
  /**
   * Lazy URL resolution — resolved at request time so that runtime config
   * overrides applied via `loadRuntimeConfig()` flow through to every call.
   * REQ-PERF-01 — clients built from this factory always use the latest URL,
   * even if it changes after the client was constructed.
   */
  getBaseUrl: () => string;
  getToken?: () => string | null;
  onUnauthorized?: () => Promise<void>;
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
  downloadBlob(path: string, filename: string): Promise<void>;
}

async function request<T>(
  path: string,
  options: RequestInit,
  clientOptions: ApiClientOptions,
  isRetry = false
): Promise<T> {
  const token = clientOptions.getToken?.();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Resolve the base URL at request time (not at construction time) so that
  // `loadRuntimeConfig()` overrides flow through to every call.
  const url = `${clientOptions.getBaseUrl()}${path}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401 && !isRetry && clientOptions.onUnauthorized) {
      await clientOptions.onUnauthorized();
      return request<T>(path, options, clientOptions, true);
    }

    let message = "Request failed";
    try {
      const errorBody = await response.json();
      message = errorBody.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new ApiClientError(message, response.status);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return {
    get<T>(path: string): Promise<T> {
      return request<T>(path, { method: "GET" }, options);
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return request<T>(
        path,
        { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined },
        options
      );
    },
    put<T>(path: string, body?: unknown): Promise<T> {
      return request<T>(
        path,
        { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined },
        options
      );
    },
    patch<T>(path: string, body?: unknown): Promise<T> {
      return request<T>(
        path,
        { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined },
        options
      );
    },
    delete<T>(path: string): Promise<T> {
      return request<T>(path, { method: "DELETE" }, options);
    },
    async downloadBlob(path: string, filename: string): Promise<void> {
      const token = options.getToken?.();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${options.getBaseUrl()}${path}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        if (response.status === 401 && options.onUnauthorized) {
          await options.onUnauthorized();
          return this.downloadBlob(path, filename);
        }
        throw new ApiClientError("Download failed", response.status);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
}

// Runtime configuration loader — reads from config.json bundled with the app
let _runtimeApiUrl: string | null = null;

export async function loadRuntimeConfig(): Promise<void> {
  try {
    const res = await fetch("/config.json", { cache: "no-store" });
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.apiBaseUrl) {
        _runtimeApiUrl = cfg.apiBaseUrl;
        return;
      }
    }
  } catch {
    // silently fall back to build-time or default URL
  }
}

// Build-time fallback (Vite define injection)
declare const __API_BASE_URL__: string;

function resolveBaseUrl(): string {
  // 1. Runtime config wins (allows hot-swapping without rebuild)
  if (_runtimeApiUrl) return _runtimeApiUrl;

  // 2. Build-time env (Vite define)
  if (typeof __API_BASE_URL__ !== "undefined") return __API_BASE_URL__;

  // 3. Ultimate fallback for safety
  return "http://localhost:8080";
}

/**
 * Returns the current API base URL. Callers MUST use this getter rather than
 * caching the value at module load when the URL may have been mutated by
 * `loadRuntimeConfig()` after the module was evaluated.
 *
 * Used directly by raw fetch call sites (`useAuthStore`, `useOAuth`,
 * `ShareDialog`) and by the `apiClient` / `authApiClient` singletons via
 * `createApiClient({ getBaseUrl: getApiBaseUrl })`.
 *
 * REQ-PERF-01 — runtime URL resolution must reach every API call site.
 */
export function getApiBaseUrl(): string {
  return resolveBaseUrl();
}

let _tokenGetter: (() => string | null) | null = null;
let _onUnauthorized: (() => Promise<void>) | null = null;

export function configureApiClient(
  getToken: () => string | null,
  onUnauthorized: () => Promise<void>
) {
  _tokenGetter = getToken;
  _onUnauthorized = onUnauthorized;
}

// Singletons — bound to `getApiBaseUrl` so they always hit the latest URL
// after `loadRuntimeConfig()` resolves. REQ-PERF-01.
export const apiClient = createApiClient({
  getBaseUrl: getApiBaseUrl,
  getToken: () => _tokenGetter?.() ?? null,
  onUnauthorized: () => _onUnauthorized?.() ?? Promise.resolve(),
});