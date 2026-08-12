import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTagStore } from "./useTagStore";
import type { Tag } from "../types";

const mockTag: Tag = {
  id: "tag-1",
  name: "important",
  userId: "u1",
  createdAt: "2024-01-01",
};

beforeEach(() => {
  useTagStore.setState({ tags: [], isLoading: false, error: null });
  vi.restoreAllMocks();
});

describe("useTagStore", () => {
  it("fetchTags populates tags from API", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [mockTag],
    });

    const { result } = renderHook(() => useTagStore());

    await act(async () => {
      await result.current.fetchTags();
    });

    expect(result.current.tags).toHaveLength(1);
    expect(result.current.tags[0].name).toBe("important");
  });

  it("createTag adds new tag to store", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "tag-2" }),
    });

    const { result } = renderHook(() => useTagStore());

    await act(async () => {
      await result.current.createTag("work");
    });

    // After create, store should trigger a fetch OR add optimistically
    // Our impl will add optimistically with the returned id
    expect(result.current.tags).toHaveLength(1);
    expect(result.current.tags[0].name).toBe("work");
  });

  it("deleteTag removes tag from store", async () => {
    useTagStore.setState({ tags: [mockTag] });
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => null,
    });

    const { result } = renderHook(() => useTagStore());

    await act(async () => {
      await result.current.deleteTag("tag-1");
    });

    expect(result.current.tags).toHaveLength(0);
  });

  it("fetchTags sets error on failure", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useTagStore());

    await act(async () => {
      await result.current.fetchTags();
    });

    expect(result.current.error).not.toBeNull();
  });
});
