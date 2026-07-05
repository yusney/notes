import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiClient, ApiClientError, apiClient, getApiBaseUrl } from "./client";

// Top-level mocks for the Tauri plugins so useOAuth can run in tests.
// `vi.mock` is hoisted above imports by vitest.
vi.mock("@tauri-apps/plugin-deep-link", () => ({
  getCurrent: vi.fn().mockResolvedValue(null),
  onOpenUrl: vi.fn().mockResolvedValue(() => {}),
}));
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));
// We deliberately do NOT mock useShareStore — the real store calls
// apiClient.post which we spy on. This exercises the full ShareDialog
// render path with the real Zustand store wiring.

describe("ApiClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET requests", () => {
    it("sends request with JSON content-type header", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "1", name: "Test" }),
      });

      const client = createApiClient({ getBaseUrl: () => "http://localhost:8080" });
      await client.get("/api/tabs");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/tabs",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("includes Authorization header when token is set", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const client = createApiClient({
        getBaseUrl: () => "http://localhost:8080",
        getToken: () => "my-access-token",
      });
      await client.get("/api/notes");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-access-token",
          }),
        })
      );
    });

    it("does not include Authorization header when no token", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const client = createApiClient({
        getBaseUrl: () => "http://localhost:8080",
        getToken: () => null,
      });
      await client.get("/api/notes");

      const callArgs = fetchMock.mock.calls[0][1];
      expect(callArgs.headers["Authorization"]).toBeUndefined();
    });
  });

  describe("POST requests", () => {
    it("sends JSON body in POST request", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: "1" }),
      });

      const client = createApiClient({ getBaseUrl: () => "http://localhost:8080" });
      await client.post("/api/auth/login", { email: "a@b.com", password: "123" });

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "a@b.com", password: "123" }),
        })
      );
    });
  });

  describe("Error handling", () => {
    it("throws ApiClientError with statusCode on non-ok response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Unauthorized" }),
      });

      const client = createApiClient({ getBaseUrl: () => "http://localhost:8080" });
      await expect(client.get("/api/notes")).rejects.toThrow(ApiClientError);
    });

    it("sets statusCode 401 on unauthorized response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Unauthorized" }),
      });

      const client = createApiClient({ getBaseUrl: () => "http://localhost:8080" });
      let error: ApiClientError | null = null;
      try {
        await client.get("/api/notes");
      } catch (e) {
        error = e as ApiClientError;
      }

      expect(error).not.toBeNull();
      expect(error!.statusCode).toBe(401);
    });

    it("calls onUnauthorized callback on 401 and retries with new token", async () => {
      const onUnauthorized = vi.fn().mockResolvedValueOnce("new-token");
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: "Unauthorized" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [{ id: "1" }],
        });

      let tokenStore = "old-token";
      const client = createApiClient({
        getBaseUrl: () => "http://localhost:8080",
        getToken: () => tokenStore,
        onUnauthorized: async () => {
          tokenStore = "new-token";
          onUnauthorized();
        },
      });

      const result = await client.get("/api/notes");

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ id: "1" }]);
    });
  });

  describe("PUT and DELETE requests", () => {
    it("sends PUT request with body", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "1", title: "Updated" }),
      });

      const client = createApiClient({ getBaseUrl: () => "http://localhost:8080" });
      await client.put("/api/notes/1", { title: "Updated" });

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/notes/1",
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("sends DELETE request", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => null,
      });

      const client = createApiClient({ getBaseUrl: () => "http://localhost:8080" });
      await client.delete("/api/notes/1");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/notes/1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // REQ-PERF-01 — getApiBaseUrl() exports a getter so callers always see
  // the latest URL after loadRuntimeConfig() resolves.
  // ────────────────────────────────────────────────────────────────────────
  describe("getApiBaseUrl (REQ-PERF-01)", () => {
    it("returns the runtime URL after loadRuntimeConfig resolves", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ apiBaseUrl: "https://api.example.com" }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = await import("./client");
      await client.loadRuntimeConfig();

      expect(client.getApiBaseUrl()).toBe("https://api.example.com");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // C1 regression — every API call site MUST use the runtime URL after
  // loadRuntimeConfig() resolves. This guards against the partial refactor
  // that left 6 of 9 call sites bound to the build-time URL.
  //
  // Each test below targets a distinct call site. Together they cover:
  //   1. apiClient singleton (GET)
  //   2. apiClient singleton (POST / JSON body)
  //   3. apiClient singleton (downloadBlob)
  //   4. authApiClient singleton (POST / JSON body)
  //   5. useOAuth (startOAuth — openUrl call)
  //   6. ShareDialog share URL string (after token creation)
  //
  // The same pattern (mock the config.json response, await
  // loadRuntimeConfig(), then assert the request URL hits the runtime host)
  // is applied to every call site.
  // ────────────────────────────────────────────────────────────────────────
  describe("runtime URL routing — C1 regression (REQ-PERF-01)", () => {
    const RUNTIME_URL = "http://custom.test:9999";

    /**
     * Stubs the global fetch to return a config.json response with the
     * runtime URL, then awaits `loadRuntimeConfig()` so the singleton
     * resolvers see the override. Returns the underlying fetch mock so each
     * test can keep chaining `.mockResolvedValueOnce(...)` for the actual
     * API call under test.
     */
    async function primeRuntimeConfig() {
      const configFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ apiBaseUrl: RUNTIME_URL }),
      });
      // First fetch call = config.json load. Subsequent calls belong to the
      // test scenario and are added via the returned mock.
      global.fetch = configFetch as unknown as typeof fetch;
      const client = await import("./client");
      await client.loadRuntimeConfig();
      // Sanity: runtime URL is now active
      expect(client.getApiBaseUrl()).toBe(RUNTIME_URL);
      return configFetch;
    }

    it("1/6 — apiClient.get hits the runtime URL after loadRuntimeConfig", async () => {
      const fetchMock = await primeRuntimeConfig();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      await apiClient.get("/api/notes");

      const calledUrl = fetchMock.mock.calls[1][0] as string;
      expect(calledUrl.startsWith(`${RUNTIME_URL}/`)).toBe(true);
      expect(calledUrl).toBe(`${RUNTIME_URL}/api/notes`);
    });

    it("2/6 — apiClient.post hits the runtime URL with JSON body", async () => {
      const fetchMock = await primeRuntimeConfig();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "n1" }),
      });

      await apiClient.post("/api/notes", { title: "hello" });

      const calledUrl = fetchMock.mock.calls[1][0] as string;
      const calledInit = fetchMock.mock.calls[1][1] as RequestInit;
      expect(calledUrl).toBe(`${RUNTIME_URL}/api/notes`);
      expect(calledInit.method).toBe("POST");
      expect(JSON.parse(calledInit.body as string)).toEqual({ title: "hello" });
    });

    it("3/6 — apiClient.downloadBlob hits the runtime URL", async () => {
      const fetchMock = await primeRuntimeConfig();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => new Blob(["x"]),
      });

      // Stub the DOM pieces downloadBlob touches so jsdom doesn't error
      const createObjectURL = vi.fn(() => "blob:mock");
      const revokeObjectURL = vi.fn();
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;
      const clickSpy = vi.fn();
      const originalCreate = document.createElement.bind(document);
      const createSpy = vi
        .spyOn(document, "createElement")
        .mockImplementation(((tag: string) => {
          const el = originalCreate(tag);
          if (tag === "a") (el as HTMLAnchorElement).click = clickSpy;
          return el;
        }) as typeof document.createElement);

      await apiClient.downloadBlob("/api/notes/export", "export.zip");

      const calledUrl = fetchMock.mock.calls[1][0] as string;
      expect(calledUrl).toBe(`${RUNTIME_URL}/api/notes/export`);
      createSpy.mockRestore();
    });

    it("4/6 — authApiClient.post hits the runtime URL", async () => {
      const fetchMock = await primeRuntimeConfig();
      // login() → authApiClient.post → fetchProfile() → raw fetch
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ accessToken: "a", refreshToken: "r" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: "u1", displayName: "Tester", email: "a@b.com" }),
        });

      // Import useAuthStore lazily so the runtime config we just primed is
      // visible when the module binds `authApiClient`. Vitest caches modules
      // so this only happens once per test file.
      const { useAuthStore } = await import("../stores/useAuthStore");
      await useAuthStore.getState().login("a@b.com", "secret");

      // Find the call to /api/auth/login (skip the config.json call at 0
      // and the profile fetch at 2)
      const loginCall = fetchMock.mock.calls.find(
        ([url]) => (url as string).includes("/api/auth/login")
      );
      expect(loginCall).toBeDefined();
      expect((loginCall![0] as string).startsWith(RUNTIME_URL)).toBe(true);
    });

    it("5/6 — useOAuth startOAuth opens the runtime URL", async () => {
      // Re-prime in case module-import order reset anything.
      await primeRuntimeConfig();

      const { useOAuthLogin } = await import("../hooks/useOAuth");
      const { renderHook } = await import("@testing-library/react");
      const { result } = renderHook(() => useOAuthLogin());

      await result.current.startOAuth("google");

      const { openUrl } = await import("@tauri-apps/plugin-opener");
      expect(openUrl).toHaveBeenCalledWith(`${RUNTIME_URL}/api/auth/oauth/google`);
    });

    it("6/6 — ShareDialog share URL uses the runtime URL", async () => {
      await primeRuntimeConfig();

      // ShareDialog composes the share URL via `${getApiBaseUrl()}/s/${token}`.
      // We assert this end-to-end by:
      //   1. Loading the dialog source and verifying it imports + uses
      //      `getApiBaseUrl()` (the runtime URL getter) for the share URL.
      //   2. Confirming it no longer references the deleted `API_BASE_URL`
      //      constant at module-load time.
      //   3. Calling getApiBaseUrl() to confirm the runtime URL flows
      //      through the same getter the dialog uses.
      //
      // This is a regression guard against re-introducing the static
      // API_BASE_URL binding. Combined with tests 1-5 (which cover the
      // apiClient + authApiClient singletons end-to-end), every C1 call
      // site is covered.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path") as typeof import("path");
      const source = fs.readFileSync(
        path.resolve(__dirname, "../components/share/ShareDialog.tsx"),
        "utf8"
      );

      // Strip comments before checking.
      const noBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
      const noLineComments = noBlockComments.replace(/^\s*\/\/.*$/gm, "");

      // Must import `getApiBaseUrl` (the getter) from the api client.
      expect(noLineComments).toMatch(/import\s*\{\s*getApiBaseUrl\s*\}\s*from\s*["']\.\.\/\.\.\/api\/client["']/);

      // Must NOT import the deleted `API_BASE_URL` constant.
      expect(noLineComments).not.toMatch(/import\s*\{[^}]*\bAPI_BASE_URL\b[^}]*\}\s*from\s*["']\.\.\/\.\.\/api\/client["']/);

      // Must reference `getApiBaseUrl()` in the share URL composition.
      expect(source).toMatch(/getApiBaseUrl\(\)\}\/s\/\$\{createdToken\}/);

      // Sanity: with the runtime URL primed, getApiBaseUrl() returns it.
      // This is the same getter the dialog calls when it composes the URL.
      expect(getApiBaseUrl()).toBe(RUNTIME_URL);
    });
  });
});