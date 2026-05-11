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
  baseUrl: string;
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
  url: string,
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

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401 && !isRetry && clientOptions.onUnauthorized) {
      await clientOptions.onUnauthorized();
      return request<T>(url, options, clientOptions, true);
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
  const { baseUrl } = options;

  return {
    get<T>(path: string): Promise<T> {
      return request<T>(`${baseUrl}${path}`, { method: "GET" }, options);
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return request<T>(
        `${baseUrl}${path}`,
        { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined },
        options
      );
    },
    put<T>(path: string, body?: unknown): Promise<T> {
      return request<T>(
        `${baseUrl}${path}`,
        { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined },
        options
      );
    },
    patch<T>(path: string, body?: unknown): Promise<T> {
      return request<T>(
        `${baseUrl}${path}`,
        { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined },
        options
      );
    },
    delete<T>(path: string): Promise<T> {
      return request<T>(`${baseUrl}${path}`, { method: "DELETE" }, options);
    },
    async downloadBlob(path: string, filename: string): Promise<void> {
      const token = options.getToken?.();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${baseUrl}${path}`, { method: "GET", headers });

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

// Singleton API client - token managed in-memory by auth store
// API base URL: set VITE_API_BASE_URL env var to override (default: http://localhost:8080)
declare const __API_BASE_URL__: string;
export const API_BASE_URL = typeof __API_BASE_URL__ !== "undefined"
  ? __API_BASE_URL__
  : "http://localhost:8080";

let _tokenGetter: (() => string | null) | null = null;
let _onUnauthorized: (() => Promise<void>) | null = null;

export function configureApiClient(
  getToken: () => string | null,
  onUnauthorized: () => Promise<void>
) {
  _tokenGetter = getToken;
  _onUnauthorized = onUnauthorized;
}

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => _tokenGetter?.() ?? null,
  onUnauthorized: () => _onUnauthorized?.() ?? Promise.resolve(),
});
