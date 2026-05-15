import { describe, it, expect } from "vitest";
import { countEditorStats } from "./NoteEditor";

describe("countEditorStats", () => {
  it("returns zero chars, zero words, one line for empty string", () => {
    const result = countEditorStats("");
    expect(result.chars).toBe(0);
    expect(result.words).toBe(0);
    expect(result.lines).toBe(1);
  });

  it("returns correct counts for a single-line text", () => {
    const result = countEditorStats("const x = 1");
    expect(result.chars).toBe(11);
    expect(result.words).toBe(4); // "const", "x", "=", "1"
    expect(result.lines).toBe(1);
  });

  it("returns correct counts for multi-line text", () => {
    const result = countEditorStats("hello world\nfoo bar\nbaz");
    expect(result.chars).toBe(23);
    expect(result.words).toBe(5);
    expect(result.lines).toBe(3);
  });

  it("counts words correctly for text with extra whitespace", () => {
    const result = countEditorStats("  hello   world  ");
    expect(result.words).toBe(2);
  });

  it("handles single word correctly", () => {
    const result = countEditorStats("hello");
    expect(result.chars).toBe(5);
    expect(result.words).toBe(1);
    expect(result.lines).toBe(1);
  });
});
