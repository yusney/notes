import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NoteEditorMobileToolbar } from "./NoteEditorMobileToolbar";
import type { Editor } from "@tiptap/react";

/**
 * Builds a minimal mock Editor instance with the chain() surface the
 * mobile toolbar uses. We avoid mocking the full tiptap module — the
 * toolbar only touches `editor.isActive(name, attrs?)` and the chain
 * pipeline `editor.chain().focus().<command>().run()`.
 */
function createMockEditor(
  isActiveImpl?: (name: string, attrs?: Record<string, unknown>) => boolean
) {
  const run = vi.fn();
  const chainMethods = {
    toggleHeading: vi.fn(() => ({ run })),
    toggleBold: vi.fn(() => ({ run })),
    toggleItalic: vi.fn(() => ({ run })),
    toggleBulletList: vi.fn(() => ({ run })),
    toggleOrderedList: vi.fn(() => ({ run })),
    toggleCodeBlock: vi.fn(() => ({ run })),
    setLink: vi.fn(() => ({ run })),
  };
  const focus = vi.fn(() => chainMethods);
  const chainFn = vi.fn(() => ({ focus }));
  return {
    isActive: vi.fn(isActiveImpl ?? (() => false)),
    chain: chainFn,
    _chainMethods: chainMethods,
    _focus: focus,
    _chain: chainFn,
    _run: run,
  } as unknown as Editor & {
    _chainMethods: typeof chainMethods;
    _focus: typeof focus;
    _chain: typeof chainFn;
    _run: typeof run;
  };
}

describe("NoteEditorMobileToolbar (REQ-EDIT-02 / REQ-EDIT-03 / REQ-LAY-04)", () => {
  beforeEach(() => {
    // Mock getBoundingClientRect so each button reports a 48×48 rect —
    // comfortably above the 44×44 minimum (Apple HIG / Material 3).
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 48,
      height: 48,
      top: 0,
      left: 0,
      right: 48,
      bottom: 48,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
  });

  it("renders the mobile formatting buttons (Bold, Italic, H1-H3, Lists, CodeBlock, Link)", () => {
    const editor = createMockEditor();
    render(<NoteEditorMobileToolbar editor={editor} />);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    expect(screen.getByLabelText(/negrita/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cursiva/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/título 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/título 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/título 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lista sin orden/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lista ordenada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bloque de código/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enlace/i)).toBeInTheDocument();
  });

  it("each toolbar button has min-h-11 and min-w-11 Tailwind classes (≥44px target)", () => {
    const editor = createMockEditor();
    render(<NoteEditorMobileToolbar editor={editor} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(9);
    for (const button of buttons) {
      expect(button.className).toMatch(/min-h-11/);
      expect(button.className).toMatch(/min-w-11/);
    }
  });

  it("each toolbar button measures at least 44×44 px via getBoundingClientRect", () => {
    const editor = createMockEditor();
    render(<NoteEditorMobileToolbar editor={editor} />);
    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      const rect = button.getBoundingClientRect();
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }
  });

  it("wraps the buttons in an overflow-x-auto container for narrow viewports", () => {
    const editor = createMockEditor();
    const { container } = render(<NoteEditorMobileToolbar editor={editor} />);
    const toolbar = container.querySelector('[data-testid="editor-toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar?.className).toMatch(/overflow-x-auto/);
  });

  it("active button has aria-pressed=true and the visual highlight class", () => {
    const editor = createMockEditor((name, attrs) => {
      return name === "bold" || (name === "heading" && (attrs as { level?: number })?.level === 1);
    });
    render(<NoteEditorMobileToolbar editor={editor} />);
    const boldBtn = screen.getByLabelText(/negrita/i);
    const h1Btn = screen.getByLabelText(/título 1/i);
    const h2Btn = screen.getByLabelText(/título 2/i);

    expect(boldBtn.getAttribute("aria-pressed")).toBe("true");
    expect(boldBtn.className).toMatch(/bg-border/);

    expect(h1Btn.getAttribute("aria-pressed")).toBe("true");
    expect(h1Btn.className).toMatch(/bg-border/);

    // Inactive buttons must not have the highlight
    expect(h2Btn.getAttribute("aria-pressed")).toBe("false");
    expect(h2Btn.className).not.toMatch(/bg-border/);
  });

  it("clicking Bold triggers editor.chain().focus().toggleBold().run()", () => {
    const editor = createMockEditor();
    render(<NoteEditorMobileToolbar editor={editor} />);
    fireEvent.click(screen.getByLabelText(/negrita/i));
    expect(editor._chain).toHaveBeenCalled();
    expect(editor._focus).toHaveBeenCalled();
    expect(editor._chainMethods.toggleBold).toHaveBeenCalled();
    expect(editor._run).toHaveBeenCalled();
  });

  it("clicking CodeBlock triggers editor.chain().focus().toggleCodeBlock().run()", () => {
    const editor = createMockEditor();
    render(<NoteEditorMobileToolbar editor={editor} />);
    fireEvent.click(screen.getByLabelText(/bloque de código/i));
    expect(editor._chainMethods.toggleCodeBlock).toHaveBeenCalled();
    expect(editor._run).toHaveBeenCalled();
  });

  it("clicking Link prompts for a URL and triggers editor.chain().focus().setLink().run()", () => {
    const editor = createMockEditor();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("https://example.com");
    render(<NoteEditorMobileToolbar editor={editor} />);
    fireEvent.click(screen.getByLabelText(/enlace/i));
    expect(promptSpy).toHaveBeenCalled();
    expect(editor._chainMethods.setLink).toHaveBeenCalledWith({ href: "https://example.com" });
    expect(editor._run).toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it("clicking Link does NOT invoke setLink when the user cancels the prompt", () => {
    const editor = createMockEditor();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);
    render(<NoteEditorMobileToolbar editor={editor} />);
    fireEvent.click(screen.getByLabelText(/enlace/i));
    expect(editor._chainMethods.setLink).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });
});
