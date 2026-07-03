/**
 * REQ-GRMR-01 — Lazy grammar loading.
 *
 * Invariants the NoteViewer (and NoteEditor) wiring must satisfy:
 *
 *   1. Cold start — importing the viewer module registers ZERO grammars
 *      on the lowlight instance. Today the eager `createLowlight(all)`
 *      registers every supported language at module-load time, which
 *      defeats the purpose of REQ-GRMR-01 on mobile. The lazy loader
 *      must keep the module-level lowlight empty until the first code
 *      block of a given language forces a register.
 *
 *   2. First code block of language X — exactly one lowlight
 *      `register('X', grammar)` call per language, and exactly one
 *      dynamic-import of the `highlight.js/lib/languages/X` chunk.
 *
 *   3. Repeat calls for the same language are idempotent (no extra
 *      register, no extra dynamic import).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── lowlight mock ──────────────────────────────────────────────────────────
// We simulate the eager-registration contract of `createLowlight(grammars)`
// so the "cold start" test faithfully reflects what the real `lowlight` does
// when the eager `all` map is passed in. With our mock, every key on the
// grammars object gets a synthetic `register(name, grammar)` call BEFORE the
// returned instance is handed back. This makes the lazy refactor testable:
// today's code passes `all` (≈19 keys) → 19 register calls during module
// load; after T3.23 the same import creates zero register calls.

interface MockedLowlight {
  _registerCalls: Array<{ name: string | Record<string, unknown>; grammar?: unknown }>;
  _registeredSet: Set<string>;
  register: ReturnType<typeof vi.fn>;
  registered: (lang: string) => boolean;
  highlight: ReturnType<typeof vi.fn>;
  highlightAuto: ReturnType<typeof vi.fn>;
  listLanguages: () => string[];
}

function createMockLowlight(grammars?: unknown): MockedLowlight {
  const _registeredSet = new Set<string>();
  const _registerCalls: MockedLowlight["_registerCalls"] = [];

  function record(arg: string | Record<string, unknown>, grammar?: unknown) {
    _registerCalls.push({ name: arg, grammar });
    if (typeof arg === "string") {
      _registeredSet.add(arg);
    } else {
      for (const k of Object.keys(arg)) _registeredSet.add(k);
    }
  }

  // Mirror lowlight v3: createLowlight(grammars) eagerly registers every
  // key in `grammars`. Without this, the eager-vs-lazy behavior would not
  // be distinguishable through this mock.
  if (grammars && typeof grammars === "object") {
    const g = grammars as Record<string, unknown>;
    for (const k of Object.keys(g)) record(k, g[k]);
  }

  return {
    _registerCalls,
    _registeredSet,
    register: vi.fn(record),
    registered: (lang: string) => _registeredSet.has(lang),
    highlight: vi.fn(),
    highlightAuto: vi.fn(),
    listLanguages: () => [..._registeredSet],
  };
}

const mockInstances: MockedLowlight[] = [];

const createLowlight = vi.fn((grammars?: unknown) => {
  const inst = createMockLowlight(grammars);
  mockInstances.push(inst);
  return inst;
});

const EAGER_ALL_MAP = {
  bash: { name: "bash" },
  c: { name: "c" },
  cpp: { name: "cpp" },
  css: { name: "css" },
  go: { name: "go" },
  html: { name: "html" },
  java: { name: "java" },
  javascript: { name: "javascript" },
  json: { name: "json" },
  kotlin: { name: "kotlin" },
  markdown: { name: "markdown" },
  php: { name: "php" },
  python: { name: "python" },
  ruby: { name: "ruby" },
  rust: { name: "rust" },
  sql: { name: "sql" },
  typescript: { name: "typescript" },
  xml: { name: "xml" },
  yaml: { name: "yaml" },
};

vi.mock("lowlight", () => ({
  createLowlight,
  all: EAGER_ALL_MAP,
  common: { bash: { name: "bash" } },
}));

// Mock each highlight.js grammar module referenced by grammarLoader.
// Each vi.mock must be a top-level statement (Vitest's hoister) —
// unrolled below.
vi.mock("highlight.js/lib/languages/bash", () => ({ default: { __mockLang: "bash" } }));
vi.mock("highlight.js/lib/languages/c", () => ({ default: { __mockLang: "c" } }));
vi.mock("highlight.js/lib/languages/cpp", () => ({ default: { __mockLang: "cpp" } }));
vi.mock("highlight.js/lib/languages/css", () => ({ default: { __mockLang: "css" } }));
vi.mock("highlight.js/lib/languages/go", () => ({ default: { __mockLang: "go" } }));
vi.mock("highlight.js/lib/languages/html", () => ({ default: { __mockLang: "html" } }));
vi.mock("highlight.js/lib/languages/java", () => ({ default: { __mockLang: "java" } }));
vi.mock("highlight.js/lib/languages/javascript", () => ({ default: { __mockLang: "javascript" } }));
vi.mock("highlight.js/lib/languages/json", () => ({ default: { __mockLang: "json" } }));
vi.mock("highlight.js/lib/languages/kotlin", () => ({ default: { __mockLang: "kotlin" } }));
vi.mock("highlight.js/lib/languages/markdown", () => ({ default: { __mockLang: "markdown" } }));
vi.mock("highlight.js/lib/languages/php", () => ({ default: { __mockLang: "php" } }));
vi.mock("highlight.js/lib/languages/python", () => ({ default: { __mockLang: "python" } }));
vi.mock("highlight.js/lib/languages/ruby", () => ({ default: { __mockLang: "ruby" } }));
vi.mock("highlight.js/lib/languages/rust", () => ({ default: { __mockLang: "rust" } }));
vi.mock("highlight.js/lib/languages/sql", () => ({ default: { __mockLang: "sql" } }));
vi.mock("highlight.js/lib/languages/typescript", () => ({ default: { __mockLang: "typescript" } }));
vi.mock("highlight.js/lib/languages/xml", () => ({ default: { __mockLang: "xml" } }));
vi.mock("highlight.js/lib/languages/yaml", () => ({ default: { __mockLang: "yaml" } }));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("REQ-GRMR-01 — lazy grammar loading", () => {
  beforeEach(() => {
    mockInstances.length = 0;
    createLowlight.mockClear();
  });

  it("cold start: importing NoteViewer registers zero grammars", async () => {
    // Dynamic import evaluates NoteViewer.tsx's top-level body in this VM.
    // If NoteViewer still does `createLowlight(all)` at module scope (the
    // pre-PR3 eager pattern), the mock fakes ~19 register() calls and the
    // assertion fails — RED. After T3.23, NoteViewer uses
    // `createLazyLowlight()` (which calls createLowlight() with no args),
    // so zero register() calls happen during module load — GREEN.
    await import("./NoteViewer");
    const totalRegisters = mockInstances.reduce(
      (acc, i) => acc + i._registerCalls.length,
      0
    );
    expect(totalRegisters).toBe(0);
  });

  it("first code block: ensureGrammarRegistered('rust') registers exactly one rust grammar", async () => {
    // Dynamic import via a runtime-resolved path so Vite's static
    // analysis skips the resolution. grammarLoader is created in
    // T3.23; before then the test fails at runtime when the module
    // can't be resolved — which is the expected RED.
    const modulePath = `${"."}/grammarLoader`;
    const grammarLoader = (await import(/* @vite-ignore */ modulePath)) as {
      ensureGrammarRegistered: (lowlight: unknown, lang: string) => Promise<void>;
      createLazyLowlight: () => unknown;
    };

    // Build the mock lowlight directly — NOT through grammarLoader.createLazyLowlight()
    // so that we can pass a real MockedLowlight (with vi.fn register that
    // tracks calls) into ensureGrammarRegistered. This isolates the test
    // to the grammar registration contract and avoids coupling to how
    // createLazyLowlight is implemented internally.
    const lowlight = createMockLowlight() as unknown as MockedLowlight;
    await grammarLoader.ensureGrammarRegistered(lowlight, "rust");
    expect(lowlight.register).toHaveBeenCalledTimes(1);
    expect(lowlight.register).toHaveBeenCalledWith(
      "rust",
      expect.objectContaining({ __mockLang: "rust" }),
    );
  });

  it("repeat call for the same language is a no-op (no re-register)", async () => {
    const modulePath = `${"."}/grammarLoader`;
    const grammarLoader = (await import(/* @vite-ignore */ modulePath)) as {
      ensureGrammarRegistered: (lowlight: unknown, lang: string) => Promise<void>;
      createLazyLowlight: () => unknown;
    };
    const lowlight = createMockLowlight() as unknown as MockedLowlight;
    await grammarLoader.ensureGrammarRegistered(lowlight, "rust");
    await grammarLoader.ensureGrammarRegistered(lowlight, "rust");
    expect(lowlight.register).toHaveBeenCalledTimes(1);
  });
});
