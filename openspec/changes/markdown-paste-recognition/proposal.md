# Proposal: Markdown Paste Recognition

## Intent

Users who paste markdown text into the notes editor get raw markdown symbols instead of rendered content. This forces manual reformatting after paste and breaks the "write naturally" experience. We need TipTap to auto-parse and render pasted markdown as rich nodes (headings, bold, italic, lists, blockquotes, code blocks, links, task lists, HR).

## Scope

### In Scope
- Install and configure `tiptap-markdown` to handle paste-to-rich-content conversion
- Add `@tiptap/extension-link`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item` to both editor and viewer
- Update `NoteEditor.tsx` extensions array with new packages
- Update `NoteViewer.tsx` extensions to match schema (required for consistent rendering)
- Add/update unit tests in `NoteEditor.test.tsx`
- Create `NoteViewer.test.tsx` for viewer rendering coverage

### Out of Scope
- Backend changes — content storage remains HTML (no format migration)
- Markdown export or live markdown editing mode
- TipTap Pro extensions
- Image paste or file upload handling
- Custom markdown shortcuts (slash commands, autocomplete)

## Capabilities

### New Capabilities
- `markdown-paste`: Converts pasted markdown text to TipTap rich nodes (headings, bold, italic, lists, blockquotes, code blocks, links, task lists, HR)
- `task-list-rendering`: Renders interactive checkbox task lists in both editor and viewer

### Modified Capabilities
None

## Approach

1. Install `tiptap-markdown`, `@tiptap/extension-link`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`
2. Add `Markdown.configure({ transformPastedText: true })` from `tiptap-markdown` to the editor extensions
3. Extend both editor and viewer with the new node/mark extensions to keep schemas in sync
4. Configure Link extension with `autolink: true` and safe protocol validation
5. No serialization changes needed — TipTap still outputs HTML to storage

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/NoteEditor.tsx` | Modified | Add 4 extensions + Markdown paste handler |
| `src/components/NoteViewer.tsx` | Modified | Add same node/mark extensions to match schema |
| `src/components/NoteEditor.test.tsx` | Modified | Add paste behavior tests |
| `src/components/NoteViewer.test.tsx` | New | Create viewer rendering tests |
| `package.json` | Modified | 4 new dependencies (all MIT) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Schema mismatch between editor and viewer causes render errors | Med | Always update both files together in same task |
| `tiptap-markdown` conflicts with existing `CodeBlockLowlight` | Low | Test paste of fenced code blocks explicitly |
| Link extension XSS via `javascript:` hrefs | Low | Configure `validate` option to allowlist `http/https/mailto` |

## Rollback Plan

Remove the 4 packages from `package.json` and revert `NoteEditor.tsx` and `NoteViewer.tsx` to their pre-change extension arrays. No DB migration needed — content was never changed.

## Dependencies

- `tiptap-markdown` (MIT) — paste markdown transformation
- `@tiptap/extension-link` (MIT) — link node support
- `@tiptap/extension-task-list` + `@tiptap/extension-task-item` (MIT) — task list nodes

## Success Criteria

- [ ] Pasting `# Heading\n**bold** _italic_` renders as H1 + formatted text, not raw markdown
- [ ] Pasting `- [ ] task` renders an interactive checkbox
- [ ] Pasting a fenced code block renders with syntax highlighting (existing CodeBlockLowlight)
- [ ] NoteViewer renders task lists and links without console errors
- [ ] No regressions in existing editor tests
- [ ] `NoteViewer.test.tsx` covers heading, bold, task list, and link rendering
