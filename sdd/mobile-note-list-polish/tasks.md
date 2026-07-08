# Tasks: mobile-note-list-polish

Wire store pagination to mobile home list (MobileHomePage → NoteList), tighten row density via `md:` Tailwind variants, add long-press `NoteActionSheet` + `DeleteConfirmDialog` (share-warning gate). Single PR on `release/mobile-v1`, split into 2 work-unit commits.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~387 (prod ~197 + tests ~190) |
| 400-line budget risk | Low (slightly under) |
| Chained PRs recommended | No (single-PR strategy) |
| Suggested split | Single PR on release/mobile-v1 with 2 work-unit commits (A + B) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Work-Unit Commits Plan

| # | Commit | Tasks | LOC | Standalone because |
|---|--------|-------|-----|--------------------|
| A | `feat(mobile-list): wire pagination + tighten density` | T4, T5, T6, T7 | ~77 prod + ~50 test (~127) | Mobile pagination renders + density ≤56px; desktop 1280×800 byte-identical (REQ-LAY-01) |
| B | `feat(mobile-list): add long-press delete with share-warning gate` | T1, T2, T3, T8 | ~145 prod + ~105 test (~250) | Long-press 500ms opens sheet; Eliminar dialog gates on `getShareWarning`; existing desktop delete flow untouched |

Each commit independently builds + tests pass.

## TDD Discipline Note

- `strict_tdd: true` per `sdd-init/notes`.
- New-component tasks (T1, T8): **failing test → implementation → green**.
- Wiring tasks (T2, T3, T5, T6): add assertions to existing `NoteList.test.tsx` / `MobileHomePage` test + verify no regression.
- Layout tasks (T4, T7): extend existing tests (`NoteList.test.tsx` density, `Pagination.test.tsx` mobile stack).
- React 19 Compiler: NO manual `useMemo` / `useCallback`.
- Tailwind 4: NO `var()` in `className`, NO new `--spacing-*` / `--text-*` tokens. Reuse `min-h-11 min-w-11` (44px touch target), `bg-accent-subtle border-l-2 border-accent text-text-primary`, `text-danger bg-danger/10`.

## Phase 1 — Action sheet (TDD)

### T1 — `NoteActionSheet` new component (TDD, mobile-only) [~125 LOC]
- **Files**: `apps/client/src/components/notes/NoteActionSheet.tsx` (new +55), `NoteActionSheet.test.tsx` (new +70)
- **Steps**: 1. RED: assert title rendered + each action button present. 2. GREEN: wrap `<Modal>` (native `<dialog>`); `props: { noteTitle, actions: {kind, label, icon}[], onAction(kind), open, onClose }`; buttons `min-h-11 min-w-11`. 3. REFACTOR: `const ACTION_KIND = { Delete: "delete" } as const` per TS skill.
- **Tests**: `pnpm test NoteActionSheet` (render + onAction spy + backdrop close)
- **Deps**: — | **Tag**: mobile-only

### T2 — Long-press handler on `NoteRow` (TDD, mobile-only) [~40 LOC]
- **Files**: `apps/client/src/components/notes/NoteList.tsx` (+25 in NoteRow), `NoteList.test.tsx` (+15)
- **Steps**: 1. RED: `fireEvent.touchStart`/`touchEnd` with 500ms fake timer → assert `NoteActionSheet` mounted. Cancel cases: <500ms hold OR `touchMove` >10px displacement. 2. GREEN: `onTouchStart` records `{t0, x0, y0}`; `onTouchMove` cancels if `hypot > 10`; `onTouchEnd` cancels if `now - t0 < 500`; else fire `onLongPress(noteId)`. 3. Add `longPressFiredRef` per-row; `onClick` short-circuits if ref is true (reset on `touchStart`). Use `vi.useFakeTimers()` per `mobile-note-edit` pattern.
- **Tests**: `pnpm test NoteList` (long-press opens, cancel-on-move, cancel-on-release, no double-fire of onNoteSelect after long-press)
- **Deps**: T1 | **Tag**: mobile-only

### T3 — Wire `NoteActionSheet` into `NoteList` (mobile-only) [~20 LOC]
- **Files**: `apps/client/src/components/notes/NoteList.tsx` (+10 in `NoteList` body, not `NoteRow`), `NoteList.test.tsx` (+10)
- **Steps**: Add `useState` `{noteId: string|null, open: boolean}` for sheet. Pass `onLongPress` from row → opens sheet with `noteTitle + actions=[{kind:"delete", label:"Eliminar", icon:"🗑"}]`. `onAction("delete")` closes sheet then opens `DeleteConfirmDialog`. Sheet is sibling of `<ul>` (mirrors `MoveToTabMenu` mount pattern).
- **Tests**: existing `NoteList.test.tsx` extended with sheet open/close flow
- **Deps**: T1, T2 | **Tag**: mobile-only

## Phase 2 — Density (mobile-only variants, desktop-safe)

### T4 — Density tightening on `NoteRow` (desktop-safe) [~30 LOC]
- **Files**: `apps/client/src/components/notes/NoteList.tsx` (+15 on row classes), `NoteList.test.tsx` (+15)
- **Steps**: 1. Row `<button>`: `px-3 py-2 md:px-4 md:py-3`. 2. Hide tab-eyebrow chip + tag-chip row on `md:hidden`. 3. Preview: `line-clamp-1 md:line-clamp-2`. 4. Tighten `mb-2` → `mb-1`. Test mocks `getBoundingClientRect` to return height 56 at viewport 375 (per `mobile-note-edit` precedent).
- **Tests**: assert `data-testid={`note-row-${id}`}` height ≤56 at 375px; desktop assertion at 1280px keeps existing height
- **Deps**: — (parallel to T1-T3) | **Tag**: desktop-safe

## Phase 3 — Pagination wire-up (desktop-safe)

### T5 — Wire store pagination into `MobileHomePage` (desktop-safe) [~18 LOC]
- **Files**: `apps/client/src/pages/MobileHomePage.tsx` (+10), `MobileHomePage.test.tsx` (+8)
- **Steps**: Read `{ page, pageSize, totalCount, setPage, totalPages }` from `useNoteStore`. Build `pagination` prop: `{ page, pageSize, totalCount, onPageChange: setPage }`. Pass to `<NoteList pagination={...} />`. Verify existing `setPage` already calls `fetchNotes` after (line 414).
- **Tests**: RTL with mocked store → `NoteList` receives `pagination` with `onPageChange` matching `setPage`
- **Deps**: — | **Tag**: desktop-safe

### T6 — Hide pagination when `totalPages === 1` (desktop-safe) [~6 LOC]
- **Files**: `apps/client/src/pages/MobileHomePage.tsx` (+3), `MobileHomePage.test.tsx` (+3)
- **Steps**: Gate at `MobileHomePage`: `pagination={totalPages > 1 ? { ... } : undefined}`. Avoids `Pagination.tsx` change for this concern.
- **Tests**: assert `pagination` prop is `undefined` when `totalPages === 1`; defined when `totalPages === 2`
- **Deps**: T5 | **Tag**: desktop-safe

### T7 — Vertical pagination layout via `mobileLayout` opt-in (desktop-safe) [~23 LOC]
- **Files**: `apps/client/src/components/notes/Pagination.tsx` (+8), `Pagination.test.tsx` (+15)
- **Steps**: 1. RED: assert buttons stack vertically when `mobileLayout=true` (class includes `flex-col`), horizontal when `false`/undefined. 2. GREEN: add `mobileLayout?: boolean` prop. Container: `flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-2`. Buttons: `w-full md:w-auto`. Info text: `w-full md:w-auto`. `mobileLayout` defaults to `false` → desktop byte-identical.
- **Tests**: assert desktop (1280px) class hash unchanged when `mobileLayout=false`; class includes `flex-col md:flex-row` when `true`
- **Deps**: — (parallel to T5/T6) | **Tag**: desktop-safe

## Phase 4 — Delete confirmation with share warning (TDD)

### T8 — `DeleteConfirmDialog` + share-warning gate (TDD, mobile-only) [~125 LOC]
- **Files**: `apps/client/src/components/notes/DeleteConfirmDialog.tsx` (new +55), `DeleteConfirmDialog.test.tsx` (new +70)
- **Steps**: 1. RED: render with `noteTitle` shows title + warning copy + Cancelar/Eliminar buttons. 2. GREEN: wrap `<Modal>`; on mount call `useNoteStore.getShareWarning(noteId)`; if `hasActiveShares`, prepend `Esta nota tiene ${count} enlace(s) compartido(s). Al eliminarla, los enlaces dejarán de funcionar.` 3. Eliminar button: `onClick={() => useNoteStore.deleteNote(noteId).then(onClose).catch(...) }`. 4. Cancelar: just `onClose()`. `await` for `getShareWarning`; show loading state while pending to keep UI responsive (per design §Risks).
- **Tests**: `pnpm test DeleteConfirmDialog` (no-shares: omit warning; shares=2: show warning with count; confirm calls deleteNote; cancel closes; Escape closes)
- **Deps**: T1 (Modal wrapping pattern), T3 (invoked from sheet flow) | **Tag**: mobile-only

## Phase 5 — Visual smoke + commit

### T9 — Visual smoke + desktop byte-identical baseline (mobile-only) [0 LOC]
- **Files**: `docs/screenshots/v1/mobile-note-list-polish-{mobile-375,mobile-360,desktop-baseline}.png` (new binaries)
- **Steps**: chrome-devtools-mcp at 375×812 (12 notes → pagination + long-press + delete), 360×640 (no overflow), 1280×800 desktop. `cmp docs/screenshots/v1/mobile-note-list-polish-desktop-baseline.png docs/screenshots/v1/shell-redesign-v1-pr3-desktop-baseline.png` → exit 0 (REQ-LAY-01).
- **Tests**: visual only; `cmp` returns 0 for desktop
- **Deps**: T1–T8 | **Tag**: mobile-only

### T10 — Commit work units + save apply-progress [0 LOC]
- **Files**: git history only
- **Steps**: Conventional commits, no AI trailer. Commit A: `feat(mobile-list): wire pagination + tighten density` (T4, T5, T6, T7). Commit B: `feat(mobile-list): add long-press delete with share-warning gate` (T1, T2, T3, T8). Then `mem_save` to `sdd/mobile-note-list-polish/apply-progress` with `capture_prompt: false`, `type: architecture`.
- **Tests**: `pnpm typecheck && pnpm test` green from clean tree; `git log --oneline release/mobile-v1 -2` shows 2 commits
- **Deps**: T9 | **Tag**: desktop-safe

## Acceptance for the whole change

- REQ-LIST-01..05 + REQ-LAY-05 covered by tests (~551 prior + ~14 new ≈ 565).
- TS clean, `pnpm typecheck && pnpm test && pnpm build` green.
- Mobile 375×812 + 360×640 screenshots show pagination + long-press sheet + delete dialog.
- Desktop 1280×800 byte-identical to PR3 baseline (`cmp` exit 0; REQ-LAY-01).
- Long-press correctly cancels on scroll (`touchMove > 10px`).
- Share-warning gate calls `getShareWarning` before delete (mirrors desktop).
- `useNoteStore.deleteNote` + `setPage` + `getShareWarning` confirmed present at lines 316, 414, 366.
- TipTap parity invariant (#2227): editor/viewer untouched → invariant holds by construction.
