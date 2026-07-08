/**
 * "Copiar" button for TipTap code blocks (viewer only).
 *
 * Defined in its own file so the parent `extensions.tsx` can be
 * fast-refreshed (Vite/React Fast Refresh requires component files
 * to export only React components; a local hook-using function in a
 * file that exports extension arrays triggers the
 * react-doctor/only-export-components rule).
 */
import { useState } from "react";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";

export function CodeBlockCopyButton({ node }: Pick<NodeViewProps, "node">) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (copied) return;
    await navigator.clipboard.writeText(node.textContent ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <NodeViewWrapper className="relative my-4">
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar código"
        className="absolute top-2 right-2 z-10 rounded border border-border bg-surface-elevated px-2 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        {copied ? "Copiado ✓" : "Copiar"}
      </button>
      <pre>
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}
