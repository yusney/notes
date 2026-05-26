# Specification: markdown-paste-recognition

## Domain: markdown-paste

### Purpose
Handles the conversion of pasted plain text containing markdown syntax into TipTap rich nodes.

### Requirements

#### Requirement: Paste Markdown Transformation
The system MUST transform plain text containing markdown syntax into corresponding TipTap rich nodes when pasted into the NoteEditor. Supported elements MUST include headings (H1-H3), bold, italic, bullet lists, ordered lists, blockquotes, inline code, fenced code blocks, horizontal rules, links, and task lists.

##### Scenario: Paste Bold Text
- GIVEN a user copies plain text `**hello**`
- WHEN the text is pasted into the NoteEditor
- THEN it MUST render as a bold node, not raw text

##### Scenario: Paste Headings and Lists
- GIVEN a user copies plain text `# Title\n\n- item 1\n- item 2`
- WHEN the text is pasted into the NoteEditor
- THEN it MUST render as an H1 node followed by a bullet list

##### Scenario: Paste Task List
- GIVEN a user copies plain text `- [ ] pending\n- [x] done`
- WHEN the text is pasted into the NoteEditor
- THEN it MUST render as task list nodes

##### Scenario: Paste Link
- GIVEN a user copies plain text `[Google](https://google.com)`
- WHEN the text is pasted into the NoteEditor
- THEN it MUST render as a clickable link node

##### Scenario: Paste Plain Text
- GIVEN a user copies plain text with no markdown symbols
- WHEN the text is pasted into the NoteEditor
- THEN it MUST render as-is without any structural transformation

##### Scenario: Paste HTML Source (Edge Case)
- GIVEN a user copies content from an external rich text source (HTML)
- WHEN the content is pasted into the NoteEditor
- THEN it MUST preserve existing rich formatting and not be broken by markdown parsing

---

## Domain: task-list-rendering

### Purpose
Handles the rendering and interactivity of task list nodes across the editor and viewer components.

### Requirements

#### Requirement: Render Task Lists
The NoteEditor and NoteViewer MUST both render task list nodes (checkboxes). 

##### Scenario: NoteEditor Interactive Tasks
- GIVEN a document containing task list nodes in the NoteEditor
- WHEN the user clicks a checkbox
- THEN the checkbox MUST toggle its completion state

##### Scenario: NoteViewer Read-Only Tasks
- GIVEN a document containing task list nodes in the NoteViewer
- WHEN the user views the task list
- THEN the checkboxes MUST be visible
- AND they MUST NOT be interactive (read-only)

---

## Domain: link-rendering

### Purpose
Handles the rendering and behavior of hyperlink nodes across the editor and viewer components.

### Requirements

#### Requirement: Render Hyperlinks
The NoteEditor and NoteViewer MUST both render link nodes. 

##### Scenario: Render Clickable Links
- GIVEN a document containing a link
- WHEN it is viewed in either NoteEditor or NoteViewer
- THEN it MUST render as a hyperlink rather than raw text

#### Requirement: Open Links in External Browser
Links within the NoteViewer MUST open in a new tab.

##### Scenario: Open Links in External Browser
- GIVEN a rendered link in the NoteViewer
- WHEN the user clicks the link
- THEN it MUST open in an external browser tab (`target="_blank"`)
