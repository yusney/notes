import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";

/**
 * Bundle assertions (REQ-PERF-09, T8)
 *
 * Reads dist/assets/*.js after pnpm build and asserts:
 *   - All expected vendor chunks emitted with [name]-[hash].js pattern
 *   - Main entry chunk gzip ≤400 KB (acceptance: T8 budget)
 *   - Login route chunk raw <300 KB (sanity)
 *
 * These tests run AFTER `pnpm build`. If dist/ is stale or missing,
 * the test suite re-builds first.
 */

const DIST_DIR = resolve(__dirname, "../../dist/assets");

function ensureBuilt() {
  if (!existsSync(DIST_DIR)) {
    execSync("pnpm build", {
      cwd: resolve(__dirname, "../.."),
      stdio: "pipe",
    });
  }
}

function listChunks(): string[] {
  ensureBuilt();
  return readdirSync(DIST_DIR).filter((f) => f.endsWith(".js"));
}

function gzipSize(filepath: string): number {
  const { gzipSync } = require("node:zlib") as typeof import("node:zlib");
  return gzipSync(readFileSync(filepath)).length;
}

function rawSize(filepath: string): number {
  return readFileSync(filepath).length;
}

describe("bundle assertions (REQ-PERF-09, T8)", () => {
  beforeAll(() => {
    ensureBuilt();
  }, 120_000);

  it("emits the expected vendor chunks with [name]-[hash].js pattern", () => {
    const chunks = listChunks();
    const expected = ["react", "router", "tiptap", "code", "dnd"];
    // Vite hashes can include `-` as a separator between base64-like chars
    // (e.g. `react-D2GyzDo-.js`), so the chunk name regex tolerates any
    // number of `[A-Za-z0-9-]` chars between the leading dash and the
    // trailing `.js`.
    const chunkNameRe = /-[\w-]+\.js$/;
    for (const name of expected) {
      const match = chunks.find((f) => f.startsWith(`${name}-`) && chunkNameRe.test(f));
      expect(match, `expected vendor chunk ${name}-*.js to be emitted; got ${chunks.join(", ")}`).toBeDefined();
    }
  });

  it("emits a main entry chunk under assets/index-*.js", () => {
    const chunks = listChunks();
    const entry = chunks.find((f) => f.startsWith("index-") && /-[\w-]+\.js$/.test(f));
    expect(entry, "expected main entry index-*.js chunk").toBeDefined();
  });

  it("main entry chunk gzip ≤400 KB (REQ-PERF-09 acceptance)", () => {
    const chunks = listChunks();
    const entry = chunks.find((f) => f.startsWith("index-") && /-\w+\.js$/.test(f));
    expect(entry).toBeDefined();
    const gz = gzipSize(join(DIST_DIR, entry!));
    // Acceptance: main JS bundle gzip ≤400 KB. Actual measurement
    // should be much lower (~10 KB) thanks to lazy loading + manualChunks.
    expect(gz, `main entry gzip = ${gz} bytes`).toBeLessThanOrEqual(400 * 1024);
  });

  it("Login route chunk is under 300 KB raw", () => {
    const chunks = listChunks();
    const login = chunks.find((f) => f.startsWith("LoginPage-") && /-\w+\.js$/.test(f));
    expect(login, "expected LoginPage route chunk").toBeDefined();
    const raw = rawSize(join(DIST_DIR, login!));
    expect(raw, `LoginPage raw = ${raw} bytes`).toBeLessThanOrEqual(300 * 1024);
  });
});
