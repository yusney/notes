import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNoteStore } from "./useNoteStore";

// Pure function extracted from exportNotes: build download trigger
export function buildBlobDownload(blob: Blob, filename: string): () => void {
  return () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
}

describe("buildBlobDownload (pure helper)", () => {
  it("creates an anchor element with the correct download attribute", () => {
    const blob = new Blob(["zip data"], { type: "application/zip" });
    const filename = "notes-export.zip";

    const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation((el) => el);
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:fake-url");
    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    buildBlobDownload(blob, filename)();

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:fake-url");

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    clickSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it("uses the provided filename as the download attribute", () => {
    const blob = new Blob(["data"]);
    const filename = "my-export-20260508.zip";

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    let capturedAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      capturedAnchor = this;
    });

    buildBlobDownload(blob, filename)();

    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.download).toBe(filename);

    vi.restoreAllMocks();
  });
});

describe("useNoteStore.exportNotes", () => {
  beforeEach(() => {
    useNoteStore.setState({
      tabs: [],
      notes: [],
      activeTabId: null,
      activeNoteId: null,
      searchQuery: "",
      selectedTagIds: [],
      isLoading: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  it("calls apiClient fetch with /api/notes/export and triggers download", async () => {
    const fakeZip = new Blob(["PK zip data"], { type: "application/zip" });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(fakeZip, {
        status: 200,
        headers: { "Content-Type": "application/zip" },
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    await useNoteStore.getState().exportNotes();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/notes/export"),
      expect.any(Object)
    );
    expect(clickSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
