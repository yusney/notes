export function countEditorStats(text: string): { chars: number; words: number; lines: number } {
  const chars = text.length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const lines = text === "" ? 1 : text.split("\n").length;
  return { chars, words, lines };
}
