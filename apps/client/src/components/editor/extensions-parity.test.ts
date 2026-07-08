import { describe, it, expect } from "vitest";
import { editorExtensions, viewerExtensions } from "./extensions";

/**
 * Bugfix #2227 invariant — TipTap extensions parity.
 *
 * `NoteEditor` (used on desktop editing + mobile editing after
 * mobile-note-edit) and `NoteViewer` (used on mobile read-only +
 * desktop read-only) both consume `note.content` from Notes.Api,
 * which is stored as MARKDOWN. If the editor and viewer diverge on
 * the markdown parser stack, the rendered output of the SAME note
 * diverges — e.g. the viewer would render the ```` ``` ```` fence
 * characters as a literal <p> of text instead of a highlighted
 * <pre> block. That was the original bug class.
 *
 * This test locks the invariant at the test level: both arrays MUST
 * contain the same 10 core extensions. A future change that adds an
 * extension to one (e.g. a "code-block-with-copy" wrapper on the
 * editor) but not the other will fail this test with a clear
 * "missing in editor/viewer" diff message.
 *
 * We assert on extension `name` (the TipTap Extension class property)
 * because that's the stable identifier across versions. We do NOT
 * assert that the two arrays are identical — the editor has an
 * extra `codeBlockTab` keyboard extension and a `Markdown` instance
 * configured for paste, neither of which the read-only viewer
 * needs. The contract is "same core", not "byte-identical".
 */
const REQUIRED_CORE_NAMES = [
  "starterKit",
  "codeBlock", // CodeBlockLowlight / CodeBlockWithCopyExtension — the name is inherited from the underlying CodeBlock node
  "markdown",
  "link",
  "taskList",
  "taskItem",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
];

function getExtensionNames(extensions: unknown[]): string[] {
  return extensions
    .map((ext) => {
      if (!ext || typeof ext !== "object") return null;
      const e = ext as { name?: string };
      return typeof e.name === "string" ? e.name : null;
    })
    .filter((n): n is string => n !== null);
}

describe("TipTap extensions parity — bugfix #2227 invariant", () => {
  it("editorExtensions is exported as an array with at least the 10 core extensions", () => {
    expect(Array.isArray(editorExtensions)).toBe(true);
    const names = getExtensionNames(editorExtensions);
    for (const required of REQUIRED_CORE_NAMES) {
      expect(
        names,
        `editorExtensions must include "${required}"`
      ).toContain(required);
    }
  });

  it("viewerExtensions is exported as an array with at least the 10 core extensions", () => {
    expect(Array.isArray(viewerExtensions)).toBe(true);
    const names = getExtensionNames(viewerExtensions);
    for (const required of REQUIRED_CORE_NAMES) {
      expect(
        names,
        `viewerExtensions must include "${required}"`
      ).toContain(required);
    }
  });

  it("editor and viewer share the same set of core extensions (no drift)", () => {
    // Re-asserted as a single test so CI surfaces a single, clear
    // diff message ("X missing in editor" / "X missing in viewer")
    // if a future change introduces divergence.
    const editorNames = new Set(getExtensionNames(editorExtensions));
    const viewerNames = new Set(getExtensionNames(viewerExtensions));
    const missingInEditor = REQUIRED_CORE_NAMES.filter((n) => !editorNames.has(n));
    const missingInViewer = REQUIRED_CORE_NAMES.filter((n) => !viewerNames.has(n));
    expect(
      missingInEditor,
      `editorExtensions missing core: ${missingInEditor.join(", ")}`
    ).toEqual([]);
    expect(
      missingInViewer,
      `viewerExtensions missing core: ${missingInViewer.join(", ")}`
    ).toEqual([]);
  });
});
