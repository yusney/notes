import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CodeBlockBubbleMenu, SUPPORTED_LANGUAGES } from "./CodeBlockBubbleMenu";

// Mock @tiptap/extension-bubble-menu — renders children when shouldShow returns true
vi.mock("@tiptap/extension-bubble-menu", () => ({
  BubbleMenu: ({
    children,
    shouldShow,
    editor,
  }: {
    children: React.ReactNode;
    shouldShow?: (props: { editor: unknown }) => boolean;
    editor: unknown;
  }) => {
    const visible = shouldShow ? shouldShow({ editor }) : true;
    return visible ? <div data-testid="bubble-menu">{children}</div> : null;
  },
}));

function makeEditor(isCodeBlock: boolean) {
  return {
    isActive: vi.fn((name: string) => name === "codeBlock" && isCodeBlock),
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        setCodeBlock: vi.fn(() => ({ run: vi.fn() })),
      })),
    })),
    getAttributes: vi.fn(() => ({ language: null })),
  };
}

describe("CodeBlockBubbleMenu", () => {
  describe("2.1 — visibility", () => {
    it("renders the bubble menu when cursor is inside a code block", () => {
      const editor = makeEditor(true);
      render(<CodeBlockBubbleMenu editor={editor as never} onFormat={vi.fn()} />);
      expect(screen.getByTestId("bubble-menu")).toBeInTheDocument();
    });

    it("does NOT render the bubble menu when cursor is outside a code block", () => {
      const editor = makeEditor(false);
      render(<CodeBlockBubbleMenu editor={editor as never} onFormat={vi.fn()} />);
      expect(screen.queryByTestId("bubble-menu")).not.toBeInTheDocument();
    });
  });

  describe("2.2 — language dropdown", () => {
    it("renders a language selector combobox inside the bubble menu", () => {
      const editor = makeEditor(true);
      render(<CodeBlockBubbleMenu editor={editor as never} onFormat={vi.fn()} />);
      expect(screen.getByRole("combobox", { name: /language/i })).toBeInTheDocument();
    });

    it("dropdown contains supported languages from lowlight", () => {
      const editor = makeEditor(true);
      render(<CodeBlockBubbleMenu editor={editor as never} onFormat={vi.fn()} />);
      // At minimum these must be present
      const select = screen.getByRole("combobox", { name: /language/i });
      expect(select).toBeInTheDocument();
      expect(SUPPORTED_LANGUAGES).toContain("javascript");
      expect(SUPPORTED_LANGUAGES).toContain("typescript");
      expect(SUPPORTED_LANGUAGES).toContain("python");
    });

    it("calls setCodeBlock with selected language when user changes dropdown", () => {
      const setCodeBlockRun = vi.fn();
      const editor = {
        isActive: vi.fn((name: string) => name === "codeBlock"),
        chain: vi.fn(() => ({
          focus: vi.fn(() => ({
            setCodeBlock: vi.fn(() => ({ run: setCodeBlockRun })),
          })),
        })),
        getAttributes: vi.fn(() => ({ language: null })),
      };

      render(<CodeBlockBubbleMenu editor={editor as never} onFormat={vi.fn()} />);
      const select = screen.getByRole("combobox", { name: /language/i });
      fireEvent.change(select, { target: { value: "typescript" } });

      expect(editor.chain).toHaveBeenCalled();
      expect(setCodeBlockRun).toHaveBeenCalled();
    });

    it("renders a Format button in the bubble menu", () => {
      const editor = makeEditor(true);
      render(<CodeBlockBubbleMenu editor={editor as never} onFormat={vi.fn()} />);
      expect(screen.getByRole("button", { name: /format/i })).toBeInTheDocument();
    });

    it("calls onFormat callback when Format button is clicked", () => {
      const editor = makeEditor(true);
      const onFormat = vi.fn();
      render(<CodeBlockBubbleMenu editor={editor as never} onFormat={onFormat} />);
      fireEvent.click(screen.getByRole("button", { name: /format/i }));
      expect(onFormat).toHaveBeenCalledTimes(1);
    });
  });
});
