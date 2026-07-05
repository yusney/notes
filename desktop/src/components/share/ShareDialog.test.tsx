import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShareDialog } from "./ShareDialog";

describe("ShareDialog", () => {
  it("renders share dialog with create button when open", () => {
    render(
      <ShareDialog
        noteId="note-1"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/compartir nota/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear enlace/i })).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <ShareDialog
        noteId="note-1"
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText(/compartir nota/i)).not.toBeInTheDocument();
  });

  it("calls onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ShareDialog
        noteId="note-1"
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows expiry toggle that enables date picker", () => {
    render(
      <ShareDialog
        noteId="note-1"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const toggle = screen.getByRole("checkbox", { name: /fecha de expiración/i });
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);

    // DayPicker renders a calendar — verify the month grid is present
    expect(screen.getByRole("grid")).toBeInTheDocument();
    // Hour/minute spinners are present
    expect(screen.getAllByRole("button", { name: "+" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("button", { name: "−" }).length).toBeGreaterThanOrEqual(2);
  });

  // ────────────────────────────────────────────────────────────────────────
  // REQ-PERF-05 — react-day-picker CSS MUST NOT be in the cold-boot
  // render-blocking chain. Source-level assertion (mirrors the
  // vite.config.test.ts pattern): the import must be a dynamic
  // `import("react-day-picker/style.css")` inside a useEffect, NOT a
  // static top-level import.
  // ────────────────────────────────────────────────────────────────────────
  describe("lazy day-picker CSS (REQ-PERF-05)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "ShareDialog.tsx"),
      "utf8"
    );

    it("does NOT have a static top-level import of react-day-picker/style.css", () => {
      // Strip comments before checking.
      const noBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
      const noLineComments = noBlockComments.replace(/^\s*\/\/.*$/gm, "");
      // A static import would look like:
      //   import "react-day-picker/style.css";
      // at the top of the file. We assert no such line exists.
      expect(noLineComments).not.toMatch(/^import\s+["']react-day-picker\/style\.css["']\s*;/m);
    });

    it("dynamically imports react-day-picker/style.css inside a useEffect gated by isOpen", () => {
      // The lazy-load pattern must be:
      //   useEffect(() => {
      //     if (isOpen) void import("react-day-picker/style.css");
      //   }, [isOpen]);
      // We assert the structural pieces are present.
      expect(source).toMatch(/useEffect/);
      expect(source).toMatch(/if\s*\(\s*isOpen\s*\)/);
      expect(source).toMatch(/import\(\s*["']react-day-picker\/style\.css["']\s*\)/);
      // The useEffect's dependency array must include isOpen.
      expect(source).toMatch(/\[\s*isOpen\s*\]/);
    });
  });
});
