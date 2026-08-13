export const SUPPORTED_LANGUAGES = [
  "bash",
  "c",
  "cpp",
  "css",
  "go",
  "html",
  "java",
  "javascript",
  "json",
  "kotlin",
  "markdown",
  "php",
  "python",
  "ruby",
  "rust",
  "sql",
  "typescript",
  "xml",
  "yaml",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
