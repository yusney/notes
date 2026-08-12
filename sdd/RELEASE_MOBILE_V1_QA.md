# release/mobile-v1 — QA checklist

**Rama**: `release/mobile-v1` (HEAD `03523f9`, 7 commits ahead of `053af3e`)
**Base merge target**: `main` (NO mergear hasta QA)
**Tracking**: Acá se acumulan todos los cambios de mobile hasta que QA valide todo el batch.

## Commits acumulados

```
03523f9 fix(mobile): preserve previously-loaded pages when loading the next page
599a748 fix(mobile): enable vertical scroll on NoteList — add flex to <main> root
bb9ffe5 fix(mobile): infinite scroll sentinel observes the <ul> scroller, not the viewport
2f51f0b feat(mobile): show tab+preview on row + replace pagination with infinite scroll
2bbe5af fix(mobile): revert w-80 hardcoded sidebar on NoteList
f7ad19e feat(mobile-list): add long-press delete with share-warning gate
660f50b feat(mobile-list): wire pagination + tighten density
```

## QA verification matrix (375x812 viewport)

### Baseline (must stay byte-identical)
- [ ] **Wide viewport >=768px**: layout 3-columnas (sidebar notas | editor | sidebar tabs) — NO cambios
- [ ] **Editor TipTap**: sin cambios en mobile ni cliente de pantalla amplia
- [ ] **Espacios section** (SideSheet): sin cambios

### Visual (mobile home `/`)
- [ ] Lista ocupa TODO el ancho (sin margen a la derecha feo)
- [ ] Cada fila muestra: **[chip tab] + Título + Preview 1-línea**
- [ ] Altura de fila ~72-80px (no 56px como era la spec original)

### Pagination → infinite scroll
- [ ] Con >10 notas: el scroll funciona (la lista scrollea dentro del panel)
- [ ] Al scrollear al fondo: se cargan 10 notas más automáticamente
- [ ] **Las primeras notas se MANTIENEN** después de cargar la siguiente página
- [ ] Botón "Cargar más" visible como fallback mientras haya más
- [ ] "— N notas —" aparece cuando ya no hay más
- [ ] El cambio de tab / sort / filter resetea a la primera página

### Long-press → Delete (REQ-LIST-03..05)
- [ ] Long-press 500ms en una fila abre el action sheet con "Eliminar"
- [ ] Tap fuera del action sheet lo cierra sin acción
- [ ] Tap en "Eliminar" abre el dialog de confirmación
- [ ] El dialog muestra: Título de la nota + warning "Esta acción no se puede deshacer."
- [ ] Si la nota tiene shared links, el dialog muestra el warning adicional
- [ ] "Cancelar" cierra sin borrar
- [ ] "Eliminar" borra la nota y la quita de la lista
- [ ] Long-press cancelado si el dedo se mueve >10px
- [ ] Tap corto (<500ms) NO abre el menu

### Smoke
- [ ] No hay console errors al cargar `/` o al scrollear
- [ ] No hay memory leaks (long-press timer cleanup)
- [ ] TypeScript clean: `cd apps/client && npx tsc --noEmit`
- [ ] Tests: `cd apps/client && pnpm test` → **597/597 pasando**

## Known WARNINGs (no bloquean QA, son para revisar)

| # | Descripción | Acción |
|---|-------------|--------|
| W1 | Long-press timer en `NoteList.tsx:352-408` no se limpia en unmount | Recomendado: follow-up bugfix (bajo impacto — React 19 tolera) |
| W2 | Smoke visual solo se hizo en `/login` y preview page | QA ya está cubriendo este gap con esta checklist |
| W3 | `getShareWarning` fail-soft — si el endpoint falla, asume `hasActiveShares=false` | Decisión aceptada, mejor UX offline que fail-hard |
| W4 | Diff size +1394/-16 (~3.5x budget de 400 líneas) | Single-PR strategy pre-aprobada; split natural disponible en `660f50b` / `f7ad19e` boundary si el reviewer lo pide |

## Perf verification — client-boot-perf (REQ-PERF-09)

Lote de perf separado, branch `release/mobile-v1`. Acceptance es **relative**
(no hard ms target por Q3): medido contra el baseline `03523f9` (HEAD
pre-perf).

| # | Verificación | Acceptance | Cómo medirlo | Estado |
|---|--------------|------------|--------------|--------|
| P1 | Cold-boot TTI | ≥40% relative cut vs baseline | Manual DevTools Performance trace (mid-tier laptop, cold cache) — comparar Performance trace antes/después | ⏳ pendiente DevTools trace del reviewer |
| P2 | Main JS bundle gzip | ≤400 KB | `cd apps/client && pnpm build && gzip -c dist/assets/index-*.js \| wc -c` (automatizado via `tests/perf/bundle-assertions.test.ts`) | ✅ **9 KB gzip** (target era 400 KB; ~44x mejor) |
| P3 | Login route JS gzip | ≤250 KB | `gzip -c dist/assets/LoginPage-*.js \| wc -c` | ✅ **2.4 KB gzip** |
| P4 | Lazy-route smoke (chunk-level) | Cada chunk se carga UNA vez en navegación `/login → / → /notes/:id → /share/:token` | Manual DevTools Network tab — buscar chunks duplicados | ⏳ pendiente smoke del reviewer |

### Cambios estructurales (sin métricas hard)

- ✅ Auth gate split — `AuthProvider.tsx` ya NO bloquea first paint con
  global `<LoadingScreen />`. `RequireAuth` mantiene no-flash en rutas
  protegidas.
- ✅ Init paralelo — `loadRuntimeConfig` (HTTP) + `restoreToken` (IPC)
  corren vía `Promise.all` (no sequential).
- ✅ Route lazy — los 13 pages cargan via `React.lazy()` con
  `RouteErrorBoundary` + `<Suspense fallback={<RouteSuspenseFallback/>}>`
  compartido.
- ✅ Vendor split — `vite.config.ts` define `manualChunks` para
  react / router / tiptap / code / dnd (zundo no está en el dep tree,
  no se emite chunk).
- ✅ Variable fonts — `@fontsource-variable/inter` +
  `@fontsource-variable/jetbrains-mono` reemplazan los 5 imports
  estáticos.
- ✅ CSS slim — `lowlight.css` y `react-day-picker/style.css` fuera
  del cold-boot render-blocking chain.
- ✅ Editor lazy — `NoteEditor` + `NoteViewer` se cargan vía
  `React.lazy()` cuando hay nota seleccionada + `isEditing` matches.

### TipTap parity

- `apps/client/src/components/editor/NoteEditor.tsx`: source body UNCHANGED
  (solo +1 import `lowlight.css` line).
- `apps/client/src/components/editor/NoteViewer.tsx`: source body UNCHANGED
  (solo +1 import `lowlight.css` line).
- Verificación automática: `git diff main...release/mobile-v1 --
  'apps/client/src/components/editor/NoteEditor.tsx'
  'apps/client/src/components/editor/NoteViewer.tsx'` debe mostrar SOLO
  las líneas del `import "../styles/lowlight.css";`.

### Comandos útiles (perf)

```bash
# Re-correr assertions de bundle
cd apps/client && npx vitest run tests/perf/bundle-assertions.test.ts

# Build + medición
cd apps/client && pnpm build
ls -la dist/assets/*.js
echo "main gzip: $(gzip -c dist/assets/index-*.js | wc -c)"
echo "login gzip: $(gzip -c dist/assets/LoginPage-*.js | wc -c)"

# Diff size vs main
git -C /home/yusney/app/notes diff main...release/mobile-v1 --stat
```

### Caveats conocidos

- **First-deploy cache invalidation**: `manualChunks` reasigna hashes de
  todos los chunks; todos los usuarios re-descargan en el primer deploy
  post-merge (~1.2 MB spike one-time). Deploys sub-siguientes son
  incrementales. Documentar en release notes.
- **Login flicker**: el `<RequireAuth>` mantiene su short-circuit en
  `!isInitialized` para evitar flash de contenido protegido. Si la
  sesión es válida cached, el usuario ve `<LoadingScreen/>` hasta que
  `initialize()` resuelve; después navega a `/` automáticamente. Esto
  es comportamiento pre-existente preservado.

## Comandos útiles

```bash
# Levantar la app
pnpm tauri dev

# Tests
cd apps/client && pnpm test

# Tipocheck
cd apps/client && npx tsc --noEmit

# Diff vs main
git diff main...release/mobile-v1 --stat
```

## NO hacer

- ❌ NO mergear a main
- ❌ NO pushear a origin sin QA sign-off
- ❌ NO commitear la carpeta `sdd/` (es solo working copy local de Engram)
