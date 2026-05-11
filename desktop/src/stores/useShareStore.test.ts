import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useShareStore } from "./useShareStore";
import type { SharedLink } from "../types";

const mockLink: SharedLink = {
  id: "link-1",
  token: "abc123defgh456ijklmn",
  noteId: "note-1",
  createdAt: "2026-05-08T00:00:00Z",
  expiresAt: null,
  isActive: true,
};

beforeEach(() => {
  useShareStore.setState({ links: [], isLoading: false, error: null });
  vi.restoreAllMocks();
});

describe("useShareStore", () => {
  it("fetchSharedLinks populates links for a note", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [mockLink],
    });

    const { result } = renderHook(() => useShareStore());

    await act(async () => {
      await result.current.fetchSharedLinks("note-1");
    });

    expect(result.current.links).toHaveLength(1);
    expect(result.current.links[0].token).toBe("abc123defgh456ijklmn");
  });

  it("createShareLink adds link to store", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockLink,
    });

    const { result } = renderHook(() => useShareStore());

    await act(async () => {
      await result.current.createShareLink("note-1", null);
    });

    expect(result.current.links).toHaveLength(1);
    expect(result.current.links[0].isActive).toBe(true);
  });

  it("revokeShareLink removes link from store", async () => {
    useShareStore.setState({ links: [mockLink] });
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => null,
    });

    const { result } = renderHook(() => useShareStore());

    await act(async () => {
      await result.current.revokeShareLink("abc123defgh456ijklmn");
    });

    expect(result.current.links).toHaveLength(0);
  });

  it("fetchSharedLinks sets error on failure", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useShareStore());

    await act(async () => {
      await result.current.fetchSharedLinks("note-1");
    });

    expect(result.current.error).not.toBeNull();
  });
});
