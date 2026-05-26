# Design: Markdown Paste Recognition

## Technical Approach

To allow users to paste markdown and have it converted into rich nodes, we will integrate `tiptap-markdown`. We'll also add missing core TipTap extensions for links and task lists to support markdown's full feature set. Both the `NoteEditor` and `NoteViewer` components must maintain synchronized schemas to ensure that saved HTML content renders identically. Configuration will ensure viewer-specific behaviors (read-only tasks, external links).

## Architecture Decisions

### Decision: tiptap-markdown Configuration

**Choice**: Use `Markdown.configure({ transformPastedText: true, transformCopiedText: false })`.
**Alternatives considered**: Using TipTap's standard paste rules without an external plugin.
**Rationale**: Native TipTap paste rules only handle simple inline markdown, whereas `tiptap-markdown` parses full blocks using Markdown-It, guaranteeing much higher fidelity. Setting `transformCopiedText: false` prevents interfering with rich text copying.

### Decision: Extension Loading Order

**Choice**: Inject `Markdown` extension *after* `StarterKit` in the extensions array.
**Alternatives considered**: Place `Markdown` before `StarterKit`.
**Rationale**: `StarterKit` defines the base nodes. `tiptap-markdown` modifies how text is parsed into those nodes, so it must be evaluated after the node schemas are registered to prevent parsing errors.

### Decision: Task List Constraints

**Choice**: Configure `TaskItem` with `nested: false`.
**Alternatives considered**: Allow nested task lists.
**Rationale**: The TipTap `TaskItem` extension can conflict with `StarterKit`'s `bulletList` nodes when nested. Disabling nesting avoids complex schema resolution bugs while satisfying standard markdown usage.

### Decision: NoteViewer Read-Only Enforcement

**Choice**: Override `TaskItem` with `editable: false` and `Link` with `openOnClick: true` + `target: _blank` via `HTMLAttributes`.
**Alternatives considered**: Relying solely on `editable: false` at the Editor instance level.
**Rationale**: `editable: false` on the TipTap instance disables typing, but interactive node views (like checkboxes) may still react to clicks unless explicitly disabled. Links need `openOnClick: true` enabled only in the viewer to prevent accidental navigation while editing.

## Data Flow

    [Clipboard]
         │ (Paste Markdown Text)
         ▼
    NoteEditor (tiptap-markdown parses text -> ProseMirror Nodes)
         │
         ▼
    [Local State] -> HTML String
         │
         ▼
    NoteViewer (Renders HTML using matching Extension Schema)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `tiptap-markdown`, `@tiptap/extension-link`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`. |
| `desktop/src/components/editor/NoteEditor.tsx` | Modify | Add Link, TaskList, TaskItem (nested: false), and Markdown extensions after StarterKit. |
| `desktop/src/components/editor/NoteViewer.tsx` | Modify | Add matching extensions. TaskItem editable: false. Link target: _blank. |
| `desktop/src/components/editor/NoteEditor.test.tsx` | Modify | Add tests simulating markdown paste. |
| `desktop/src/components/editor/NoteViewer.test.tsx` | Create | Add tests ensuring HTML containing tasks and links renders correctly. |
| `desktop/src/index.css` | Modify | Add pointer-events/cursor styling for tasks and links. |

## Interfaces / Contracts

```typescript
// Extension array config in NoteEditor.tsx
const extensions = [
  StarterKit.configure({ codeBlock: false }),
  CodeBlockLowlight,
  CodeBlockTabExtension,
  Link.configure({ autolink: true }),
  TaskList,
  TaskItem.configure({ nested: false }),
  Markdown.configure({
    transformPastedText: true,
    transformCopiedText: false,
  }),
]

// Extension array config in NoteViewer.tsx
const extensions = [
  StarterKit.configure({ codeBlock: false }),
  CodeBlockWithCopyExtension,
  Link.configure({
    openOnClick: true,
    HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' }
  }),
  TaskList,
  TaskItem.configure({ editable: false, nested: false }),
]
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `NoteEditor` Paste | Mock clipboard paste event or use `editor.commands.insertContent` with plain text markdown and verify HTML output contains expected tags. |
| Unit | `NoteViewer` Render | Mount component with HTML containing checkboxes and links. Verify read-only state and `target="_blank"` attributes. |

## Migration / Rollout

No migration required. The storage format remains HTML strings.

## Open Questions

- [ ] Does `tiptap-markdown` properly interpret the custom `CodeBlockLowlight` node or do we need to specify a `codeBlock` mapping in its configuration?
- [ ] What is the exact path for the global CSS file to update for checkbox/link styles?
