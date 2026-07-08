# Exploration: Tauri WebView2 dev-mode boot hang (~60 s black screen)

## Current State

`pnpm tauri dev` boots three things in parallel: the Rust backend, the Vite dev
server on `http://localhost:1420`, and a WebView2 window pointing at that URL.
The Vite dev server has no `optimizeDeps` config, so every `.ts`/`.tsx` file in
the dependency graph is transformed and served individually on demand.

The frontend entry sequence is:

1. `apps/client/src/main.tsx` imports `@fontsource-variable/inter` + `...jetbrains-mono`
   (7 + 6 = **13 `@font-face` URLs**), then `./index.css`, then `App`.
2. `App.tsx` renders `<BrowserRouter>` → `<ThemeWatcher>` → `<CloseDialog>` →
   `<AuthProvider>` → `<AppRoutes>`.
3. The default route `/` is `lazyRoute(<RequireAuth><MainLayout /></RequireAuth>)`.
   `MainLayout` itself is `React.lazy()`-loaded (it pulls dnd-kit, react-router,
   NoteEditor, NoteViewer, all stores, all components — ~20+ direct imports, each
   with their own transitive tree).
4. While `MainLayout` resolves, `<Suspense>` shows `RouteSuspenseFallback` —
   but only if React has been able to start rendering at all.

`AuthProvider` correctly fires `useAuthStore.getState().initialize()` from a
`useEffect` and runs `Promise.all([loadRuntimeConfig(), restoreToken()])` in
parallel (REQ-PERF-01). This is **not** the blocker — the init is async and
non-blocking, and the login route is supposed to paint immediately on cold-boot.

## Affected Areas

- `apps/client/vite.config.ts` — **no `optimizeDeps.include`**. Vite does not
  pre-bundle any dependency, so dev mode = hundreds of on-demand transforms.
- `apps/client/src/App.tsx` — `MainLayout` is `React.lazy()`, so navigating to `/`
  triggers loading its full dep graph (TipTap ~620 KB raw, dnd-kit, lowlight,
  zundo, react-router, all stores) before any UI paints.
- `apps/client/src/main.tsx` — `@fontsource-variable/inter` and
  `.../jetbrains-mono` are imported on the **critical path** before
  `createRoot().render()`. Each one carries 6–7 `@font-face` declarations whose
  `woff2` URLs WebView2 starts fetching immediately (~1.2 MB Inter + ~200 KB
  JetBrains Mono).
- `apps/client/src/index.css` — `@import "tailwindcss"` compiles all utilities at
  request time; the served CSS includes the Tailwind output plus the theme
  tokens. The first paint is empty `<div id="root">` because the body inherits
  `--color-surface: #131313` (near-black) from `:root`, so an unresponsive
  renderer reads as **"black screen"**.
- `apps/client/src-tauri/tauri.conf.json` — window has `"visible": true`, so the
  native window paints immediately, exposing the empty WebView2 surface.

## Approaches

### 1. **Pre-bundle heavy deps with `optimizeDeps.include`** *(recommended)*

Add the heaviest deps to Vite's pre-bundle list so they ship as one or two
`@vite/deps/*.js` files instead of ~100 individual `.ts` transforms:

```ts
// vite.config.ts
optimizeDeps: {
  include: [
    "react", "react-dom", "react-dom/client",
    "react-router-dom",
    "@dnd-kit/core",
    "@tiptap/react", "@tiptap/starter-kit", "@tiptap/extension-link",
    "@tiptap/extension-placeholder", "@tiptap/extension-table",
    "@tiptap/extension-task-list", "@tiptap/extension-task-item",
    "@tiptap/extension-code-block-lowlight",
    "lowlight", "highlight.js",
    "tiptap-markdown",
    "zundo",
    "zustand",
    "@fontsource-variable/inter",
    "@fontsource-variable/jetbrains-mono",
  ],
},
```

- Pros: **Zero production-code change**. Cuts the dev cold-boot fan-out from
  ~150+ HTTP requests to ~10. WebView2's connection pool stays well under its
  per-host limit. Pre-bundling happens once when Vite starts, before the
  WebView even connects, so there is no incremental cost.
- Cons: First-time `pnpm dev` will be a few seconds slower as Vite warms the
  pre-bundled cache. Need a one-line `optimizeDeps.exclude` for any package
  that can't be bundled (none of the listed ones fall into that bucket).
- Effort: **Low** (~10 lines + one `.vite/deps_temp_*` cleanup on next `pnpm dev`).

### 2. **Move font imports out of the critical path**

Replace the JS-side `import "@fontsource-variable/inter"` in `main.tsx` with a
CSS `@import` in `index.css`, or split them behind a lazy chunk. CSS `@import`
is async and never blocks first paint.

- Pros: Removes ~1.4 MB of font fetches from the boot critical path. Aligns
  with the "slim CSS hot path" goal in commit `971e2c2`.
- Cons: Doesn't fix the MainLayout dep-graph fan-out — only the font portion.
  Browser may flash with a fallback font for ~200 ms before swap kicks in
  (`font-display: swap` is already set, so this is the current behavior).
- Effort: Low (one-line CSS change).

### 3. **Render a non-`MainLayout` route first**

Force the unauthenticated cold-boot path to render `LoginPage` synchronously
(no Suspense) when no token is in memory. Keep `MainLayout` lazy only for the
authenticated deep-link cases.

- Pros: Removes the initial MainLayout fan-out entirely from cold boot.
- Cons: Adds branching to the router that diverges from REQ-LAY-01's
  "wide-viewport-pixel-identical" goal. Touches routing semantics.
- Effort: Medium.

### 4. **Splash screen via `tauri.conf.json`**

Use a `splashscreen` plugin or `beforeLoad` event to show a native splash that
hides the empty `<div id="root">` until React's first paint fires.

- Pros: Hides the black screen behind branded chrome.
- Cons: Cosmetic only — does not address the underlying 60 s renderer stall.
  The window is still unresponsive.
- Effort: Low.

## Recommendation

**Approach #1 (primary) + Approach #2 (secondary).**

Together they:
- Cut the dev-mode HTTP request fan-out by ~95 % at cold boot.
- Take the 1.4 MB of font fetches off the JS critical path.
- Touch zero production runtime code (only Vite config + CSS imports).
- Are the smallest, safest possible change — the prior fix
  `341e141 fix(vite): disable modulePreload to fix Tauri WebView2 boot hang`
  already proved this is the right shape of fix; that patch only addressed the
  production-build side of the same root cause.

Avoid Approach #3 unless #1 + #2 do not bring the boot below 5 s — the routing
change risks regressing the lazy boundary that PR2 / PR3 set up.

Approach #4 is purely cosmetic and should not be the primary mitigation.

## Risks

- **Pre-bundling can break packages with non-standard module shape.** Risk is
  low for the listed deps (all are well-behaved ESM/CJS dual packages), but
  `lowlight` has historically been quirky — keep an eye on first-run warnings
  from Vite. If any dep fails to pre-bundle, move it to `optimizeDeps.exclude`
  and accept that it will be transformed per-request.
- **Stale Vite cache.** After editing `optimizeDeps.include`, delete
  `apps/client/node_modules/.vite/deps_temp_*` and `apps/client/node_modules/.vite/deps`
  once so the next `pnpm dev` re-bundles everything. Otherwise HMR may serve
  stale chunks and the symptom will look "fixed but weird".
- **`@fontsource-variable/*` pre-bundling.** Including CSS-only packages in
  `optimizeDeps.include` works but emits a noop-JS shim. If it logs warnings,
  move the font import into `index.css` (`@import "@fontsource-variable/inter";`)
  instead.
- **WebView2 DevTools remains useful.** Don't disable `devtools` Cargo feature.
  Once the boot is fast again, the inspector will open immediately and is the
  best way to confirm the fix.
- **`strictPort: true` could re-introduce flakiness** if Vite holds the port
  longer than expected while pre-bundling. Do not change the port config — the
  60 s hang is not a port conflict.

## Verification Steps

1. **Sanity (does it still build?):**
   - `cd apps/client && pnpm tsc --noEmit` → no type errors.
   - `cd apps/client && pnpm test` → vitest still green; the bundle-size and
     `vite.config.test.ts` (which asserts on `manualChunks`) must still pass.

2. **Dev boot timing (the actual fix):**
   - Wipe Vite cache: `rm -rf apps/client/node_modules/.vite`.
   - Stop any running `pnpm tauri dev`.
   - Start fresh: `cd apps/client && pnpm tauri dev`.
   - Stopwatch from process spawn until the **Tauri window first paints** the
     login form (not the empty dark window). Pass criterion: < 8 s on the same
     Windows machine that previously took ~60 s.
   - Repeat 3 times — first run is slower (pre-bundle warming), 2nd/3rd should
     be < 5 s.

3. **Render responsiveness during boot:**
   - With DevTools open (right-click → Inspect Element, or
     `view-inspector` if `devtools` feature is compiled in), confirm the
     `<div id="root">` shows the login markup (not empty) within 5 s.
   - The OS **must not** show the "force close or wait" ANR dialog.

4. **Regression checks:**
   - `pnpm build` succeeds (production bundle still ~620 KB TipTap chunk in its
     own lazy file).
   - `pnpm test` passes — specifically
     `apps/client/tests/perf/vite.config.test.ts` and
     `apps/client/src/api/client.test.ts` (the latter asserts on
     `loadRuntimeConfig`/`getApiBaseUrl` ordering).
   - Manual: navigate `/` → `/login` → `/` → `/login` and confirm the
     `RouteSuspenseFallback` shows briefly on each deep route (no regression
     in lazy-loading).
   - Stronghold IPC still works: log in with "remember me", quit, reopen, the
     session restores (existing e2e covers this in
     `apps/client/e2e/client-regression.spec.ts`).

5. **Memory verification:**
   - The two new Engram observations
     (`tauri-dev-boot-hang`, `client-boot-architecture`) should be retrievable
     via `mem_search "Tauri WebView2 boot hang"` and
     `mem_search "client cold-boot architecture"`.

## Ready for Proposal

**Yes.** The root cause is well-supported by the file evidence; the proposed fix
is a 10-line `vite.config.ts` change plus a one-line CSS change; the
verification path is concrete and reproducible. Recommend proceeding straight to
a `proposal.md` (no need for a separate `explore` change — the prompt was a
diagnosis, not a feature). One open question for the user before
proposal/spec:

> Do you want the font CSS move done in the same change (recommended), or kept
> as a follow-up so this change stays pure Vite-config?