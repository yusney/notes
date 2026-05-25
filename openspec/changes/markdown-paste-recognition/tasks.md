# Tasks: Markdown Paste Recognition

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280–380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: packages + extensions wiring → PR 2: tests + CSS |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

> **ask-always** maps to decision-required: the orchestrator MUST ask before each apply slice.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Install packages + wire extensions in NoteEditor/NoteViewer | PR 1 | Base: main; includes package.json + 2 component files |
| 2 | Tests (NoteEditor + NoteViewer) + CSS styles | PR 2 | Base: PR 1 branch; depends on Unit 1 |

---

## Phase 1: Foundation — Install Packages

- [x] 1.1 Add `tiptap-markdown`, `@tiptap/extension-link`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item` to `package.json` and run `pnpm install`. Acceptance: packages resolvable at build time.

---

## Phase 2: Core Implementation — NoteEditor

- [x] 2.1 **RED** — In `NoteEditor.test.tsx`, add failing test: paste `**hello**` → editor HTML contains `<strong>`. ~15 lines.
- [x] 2.2 **RED** — Add failing test: paste `- [ ] pending\n- [x] done` → HTML contains `data-type="taskItem"`. ~15 lines.
- [x] 2.3 **RED** — Add failing test: paste `[Google](https://google.com)` → HTML contains `<a href`. ~12 lines.
- [x] 2.4 **GREEN** — In `desktop/src/components/editor/NoteEditor.tsx`, add `Link.configure({ autolink: true })`, `TaskList`, `TaskItem.configure({ nested: false })`, `Markdown.configure({ transformPastedText: true, transformCopiedText: false })` after `StarterKit`. ~30 lines.
- [x] 2.5 **REFACTOR** — Extract extension array to named const `editorExtensions` for readability. ~5 lines.

---

## Phase 3: Core Implementation — NoteViewer

- [x] 3.1 **RED** — Create `desktop/src/components/editor/NoteViewer.test.tsx`; add failing test: HTML with `<a href>` renders with `target="_blank"`. ~20 lines.
- [x] 3.2 **RED** — Add failing test: HTML with task list renders checkboxes as non-interactive (`pointer-events: none` or `disabled`). ~20 lines.
- [x] 3.3 **GREEN** — In `desktop/src/components/editor/NoteViewer.tsx`, add `Link.configure({ openOnClick: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } })`, `TaskList`, `TaskItem.configure({ editable: false, nested: false })`. ~35 lines.
- [x] 3.4 **REFACTOR** — Extract extension array to named const `viewerExtensions`. ~5 lines.

---

## Phase 4: CSS + Cleanup

- [ ] 4.1 Add checkbox cursor/pointer-events styles and link color/underline overrides to `desktop/src/index.css`. ~20 lines.
- [ ] 4.2 Verify open question: test paste of fenced code block — confirm `CodeBlockLowlight` is not broken by `tiptap-markdown`. Add one regression test if needed. ~15 lines.
- [ ] 4.3 Run `pnpm test` — all scenarios green. Fix any snapshot drift.

---

## Acceptance Criteria Traceability

| Spec Scenario | Covered By |
|---------------|-----------|
| Paste bold text | 2.1 |
| Paste headings + lists | 2.4 (verified via 2.1 path) |
| Paste task list | 2.2 |
| Paste link | 2.3 |
| Paste plain text (no transform) | 2.1 negative case |
| Paste HTML source (edge case) | 4.2 |
| NoteEditor interactive tasks | 2.2 |
| NoteViewer read-only tasks | 3.2 |
| Render clickable links | 3.1 |
| Open links in external browser | 3.1 |
