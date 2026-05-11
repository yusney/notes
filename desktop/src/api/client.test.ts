import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiClient, ApiClientError } from "./client";

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

      const client = createApiClient({ baseUrl: "http://localhost:8080" });
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
        baseUrl: "http://localhost:8080",
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
        baseUrl: "http://localhost:8080",
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

      const client = createApiClient({ baseUrl: "http://localhost:8080" });
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

      const client = createApiClient({ baseUrl: "http://localhost:8080" });
      await expect(client.get("/api/notes")).rejects.toThrow(ApiClientError);
    });

    it("sets statusCode 401 on unauthorized response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Unauthorized" }),
      });

      const client = createApiClient({ baseUrl: "http://localhost:8080" });
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
        baseUrl: "http://localhost:8080",
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

      const client = createApiClient({ baseUrl: "http://localhost:8080" });
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

      const client = createApiClient({ baseUrl: "http://localhost:8080" });
      await client.delete("/api/notes/1");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/notes/1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
