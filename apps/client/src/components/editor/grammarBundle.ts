/**
 * Static grammar bundle — exported as a `Record<lang, LanguageFn>` so
 * that `grammarLoader.ensureGrammarRegistered` can pick out any single
 * language on demand without a network round-trip.
 *
 * Each grammar is the actual `highlight.js` CJS export, re-exported
 * under its language name. We use CJS-style imports because (a) the
 * `highlight.js` ESM build (`./es/languages/<lang>`) is not advertised
 * through the package `exports` field, and (b) Vite's per-language
 * globber cannot reach into `node_modules/` to find these files from
 * the project root. The cleanest available path is an explicit import
 * per language, which Vite bundles into a single chunk today.
 *
 * Aliasing notes:
 *   - "html" maps to the xml grammar — `lowlight` registers an
 *     automatic alias when you call `lowlight.register('xml', xml)`
 *     and ask for `html` (lowlight v3 inherits this from highlight.js).
 *
 * The 19 languages here are the exact set declared in `languages.ts`
 * (REQ-GRMR-01 — "Only grammars registered in languages.ts SHALL be
 * loaded"). Adding a new language there requires importing its
 * grammar here too.
 */
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import xml from "highlight.js/lib/languages/xml";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";
import type { LanguageFn } from "highlight.js";

export const SUPPORTED_GRAMMARS = [
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

export const grammarBundle: Record<(typeof SUPPORTED_GRAMMARS)[number], LanguageFn> & {
  html: LanguageFn;
} = {
  bash: bash as LanguageFn,
  c: c as LanguageFn,
  cpp: cpp as LanguageFn,
  css: css as LanguageFn,
  go: go as LanguageFn,
  java: java as LanguageFn,
  javascript: javascript as LanguageFn,
  json: json as LanguageFn,
  kotlin: kotlin as LanguageFn,
  markdown: markdown as LanguageFn,
  php: php as LanguageFn,
  python: python as LanguageFn,
  ruby: ruby as LanguageFn,
  rust: rust as LanguageFn,
  sql: sql as LanguageFn,
  typescript: typescript as LanguageFn,
  xml: xml as LanguageFn,
  yaml: yaml as LanguageFn,
  // "html" is an alias for the xml grammar in highlight.js / lowlight
  // — calling `lowlight.register('html', xmlGrammar)` is supported.
  html: xml as LanguageFn,
};
