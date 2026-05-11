import { describe, it, expect } from "vitest";
import { resolveTheme } from "./useTheme";

describe("resolveTheme (pure function)", () => {
  it("returns 'dark' when localStorage has 'dark'", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("returns 'light' when localStorage has 'light'", () => {
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("returns 'dark' when no localStorage and system prefers dark", () => {
    expect(resolveTheme(null, true)).toBe("dark");
  });

  it("returns 'light' when no localStorage and system prefers light", () => {
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("returns 'light' when localStorage has 'system' and system is light", () => {
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("returns 'dark' when localStorage has 'system' and system is dark", () => {
    expect(resolveTheme("system", true)).toBe("dark");
  });
});
