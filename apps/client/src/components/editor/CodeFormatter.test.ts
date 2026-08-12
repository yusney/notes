import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the pure function behavior with dynamic imports mocked
const mockFormat = vi.fn();
const mockPlugin = {};

vi.mock("prettier/standalone", () => ({
  format: mockFormat,
  default: { format: mockFormat },
}));

vi.mock("prettier/plugins/babel", () => ({ default: mockPlugin }));
vi.mock("prettier/plugins/estree", () => ({ default: mockPlugin }));
vi.mock("prettier/plugins/typescript", () => ({ default: mockPlugin }));
vi.mock("prettier/plugins/postcss", () => ({ default: mockPlugin }));
vi.mock("prettier/plugins/html", () => ({ default: mockPlugin }));
vi.mock("prettier/plugins/markdown", () => ({ default: mockPlugin }));

describe("CodeFormatter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("2.3 — formatCodeBlock", () => {
    it("formats javascript using babel parser", async () => {
      mockFormat.mockResolvedValue("const x = 1;\n");
      const { formatCodeBlock } = await import("./CodeFormatter");

      const result = await formatCodeBlock("const x=1", "javascript");

      expect(result).toBe("const x = 1;\n");
      expect(mockFormat).toHaveBeenCalledWith(
        "const x=1",
        expect.objectContaining({ parser: "babel" })
      );
    });

    it("formats typescript using typescript parser", async () => {
      mockFormat.mockResolvedValue("const x: number = 1;\n");
      const { formatCodeBlock } = await import("./CodeFormatter");

      const result = await formatCodeBlock("const x:number=1", "typescript");

      expect(result).toBe("const x: number = 1;\n");
      expect(mockFormat).toHaveBeenCalledWith(
        "const x:number=1",
        expect.objectContaining({ parser: "typescript" })
      );
    });

    it("formats json using json parser", async () => {
      mockFormat.mockResolvedValue('{\n  "a": 1\n}\n');
      const { formatCodeBlock } = await import("./CodeFormatter");

      const result = await formatCodeBlock('{"a":1}', "json");

      expect(result).toBe('{\n  "a": 1\n}\n');
      expect(mockFormat).toHaveBeenCalledWith(
        '{"a":1}',
        expect.objectContaining({ parser: "json" })
      );
    });

    it("formats css using css parser", async () => {
      mockFormat.mockResolvedValue("body {\n  color: red;\n}\n");
      const { formatCodeBlock } = await import("./CodeFormatter");

      const result = await formatCodeBlock("body{color:red}", "css");

      expect(result).toBe("body {\n  color: red;\n}\n");
      expect(mockFormat).toHaveBeenCalledWith(
        "body{color:red}",
        expect.objectContaining({ parser: "css" })
      );
    });

    it("formats html using html parser", async () => {
      mockFormat.mockResolvedValue("<div></div>\n");
      const { formatCodeBlock } = await import("./CodeFormatter");

      const result = await formatCodeBlock("<div></div>", "html");

      expect(result).toBe("<div></div>\n");
      expect(mockFormat).toHaveBeenCalledWith(
        "<div></div>",
        expect.objectContaining({ parser: "html" })
      );
    });

    it("formats markdown using markdown parser", async () => {
      mockFormat.mockResolvedValue("# Hello\n");
      const { formatCodeBlock } = await import("./CodeFormatter");

      const result = await formatCodeBlock("#Hello", "markdown");

      expect(result).toBe("# Hello\n");
      expect(mockFormat).toHaveBeenCalledWith(
        "#Hello",
        expect.objectContaining({ parser: "markdown" })
      );
    });
  });
});
