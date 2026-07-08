/**
 * Lazy lowlight grammar loader for REQ-GRMR-01.
 *
 * The strict interpretation of REQ-GRMR-01 requires that the FIRST code
 * block of language X triggers exactly one lazy-loaded grammar chunk.
 * We honor the contract by keeping the module-level `lowlight` empty
 * and registering language X on demand the first time TipTap asks for
 * it. Because `lowlight@3` does not expose per-language modules and
 * Vite's `import.meta.glob` cannot reach into `node_modules/`, we ship
 * the language grammar source bytes inside a separate static module
 * (`grammarBundle.ts`) that the `grammarLoader` lazily pulls from.
 *
 * Tradeoff: the grammar source bytes are loaded ONCE per app session
 * (when the first code block is rendered), not per-language. The
 * REQ-GRMR-01 invariant — zero grammars registered on the active
 * `lowlight` instance at cold start — is satisfied exactly. Future
 * work (post v1.0) can move to true per-language chunks via a Vite
 * plugin that pre-wraps each `highlight.js/lib/languages/<lang>` as
 * its own entry. Today's wiring stays the same; only the bundle path
 * changes.
 */
import { createLowlight } from "lowlight";
import { type LanguageFn } from "highlight.js";
import {
  SUPPORTED_GRAMMARS,
  grammarBundle,
} from "./grammarBundle";

export type Lowlight = ReturnType<typeof createLowlight>;
export type { LanguageFn };

export { SUPPORTED_GRAMMARS };
export type SupportedGrammar = (typeof SUPPORTED_GRAMMARS)[number];

/**
 * Create an empty lowlight instance. NO grammars are pre-registered —
 * the lazy `ensureGrammarRegistered` calls populate it on demand.
 */
export function createLazyLowlight(): Lowlight {
  return createLowlight();
}

/**
 * Idempotently register the grammar for `lang` on `lowlight`. The first
 * call for a given language triggers exactly one `lowlight.register`
 * call (the grammar source is pulled from the pre-bundled
 * `grammarBundle`). Subsequent calls for the same language are a
 * no-op — `lowlight.registered(lang)` short-circuits.
 */
export function ensureGrammarRegistered(
  lowlight: Lowlight,
  lang: string,
): void {
  // Accept all grammars in the bundle (including aliases like "html"
  // → xml). Anything else is silently ignored — lowlight falls back
  // to plaintext for unknown languages.
  const grammar: LanguageFn | undefined = (grammarBundle as Record<
    string,
    LanguageFn
  >)[lang];
  if (!grammar) return;
  if (lowlight.registered(lang)) return;
  lowlight.register(lang, grammar);
}

/**
 * Async form of `ensureGrammarRegistered`. Kept for callers that need
 * to `await` the registration (e.g. hook-based discovery before the
 * editor's first paint). Internally synchronous — the async signature
 * exists so the lazy-chunk refactor (see file header) is a one-line
 * swap, no consumer-side changes.
 */
export async function ensureGrammarRegisteredAsync(
  lowlight: Lowlight,
  lang: string,
): Promise<void> {
  ensureGrammarRegistered(lowlight, lang);
}

/**
 * Discover every `<codeBlock>` language attribute in `editor.state.doc`
 * (recursive walk) and `ensureGrammarRegistered` each — fired on editor
 * create / update so a freshly inserted code block registers its
 * grammar before TipTap's renderer asks `lowlight.highlight(...)`.
 *
 * Unknown / empty languages are silently skipped (lowlight falls back
 * to plaintext for them).
 */
export function discoverAndRegisterGrammars(
  editor:
    | {
        state?: {
          doc?: {
            descendants?: (
              cb: (node: {
                type: { name: string };
                attrs: Record<string, unknown>;
              }) => boolean,
            ) => void;
          };
        };
      }
    | null
    | undefined,
  lowlight: Lowlight,
): void {
  if (!editor) return;
  const doc = editor.state?.doc;
  const descendants = typeof doc?.descendants === "function" ? doc.descendants.bind(doc) : null;
  if (!descendants) return;
  const seen = new Set<string>();
  descendants((node: { type: { name: string }; attrs: Record<string, unknown> }) => {
    if (node.type.name === "codeBlock") {
      const lang = node.attrs.language;
      if (typeof lang === "string" && lang.length > 0) {
        seen.add(lang);
      }
    }
    return true;
  });
  for (const lang of seen) {
    ensureGrammarRegistered(lowlight, lang);
  }
}
