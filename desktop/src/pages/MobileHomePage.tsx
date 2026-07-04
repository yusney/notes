import { useNavigate } from "react-router-dom";
import { NoteList } from "../components/notes/NoteList";
import { EmptyState } from "../components/states/EmptyState";
import { useNoteStore } from "../stores/useNoteStore";

/**
 * MobileHomePage — content for the mobile home route (`/`) on mobile.
 *
 * PR3 hotfix (shell-redesign-v1): before this page existed, the
 * `MobileShell` mounted inside `MainLayout` rendered AppBar +
 * BottomNav + SideSheet but its `<main><Outlet/></main>` slot was
 * empty at `/` because `App.tsx`'s `/` route had no child route to
 * resolve the Outlet. The user saw a blank body between AppBar and
 * BottomNav (verified by `docs/screenshots/v1/pr3-home-with-notes-mobile.png`).
 *
 * This component is the routed content for `/` on mobile — mounted
 * by React Router via `<Outlet/>` from inside `MobileShell`'s
 * `<main>` slot. On desktop the same `<MobileShell/>` subtree is
 * present in the React tree but `md:hidden` makes it visually
 * invisible, so this component does not contribute pixels to the
 * desktop layout (REQ-LAY-01 desktop-pixel-identical invariant).
 *
 * Behaviour (matches `MobileSearchPage` / `MobileNotePage` patterns):
 *   - Empty store (`notes.length === 0`) → render `<EmptyState>`
 *     with a single CTA (decisions #2207 — no double-discurso).
 *   - Populated store → render `<NoteList>` filtered by the active
 *     tab and the current sort/search/tag/favorite selections.
 *   - Tapping a note row → `navigate('/notes/:id')` to open the
 *     read-only mobile viewer (the URL is the source of truth on
 *     mobile; we also keep `activeNoteId` in the store in sync so
 *     the desktop branch, if later visible, doesn't fight the
 *     mobile URL).
 *   - Tapping the empty-state CTA → `createNote` with a default
 *     title/content in the active tab (or in a freshly-created
 *     "General" tab if there are none). The BottomNav "Nueva"
 *     entry is the canonical mobile create path; this CTA is
 *     its sibling in the empty body.
 *
 * Why this is a NEW component (not a wrapper around `MobileNotePage`):
 *   `MobileNotePage` resolves `/notes/:id` — it expects a route
 *   param. The mobile home (`/`) has no `:id`. A separate page
 *   keeps each route's contract single-purpose and testable in
 *   isolation.
 */
export function MobileHomePage() {
  const navigate = useNavigate();
  const {
    notes,
    filteredNotes,
    isLoading,
    error,
    activeTabId,
    tabs,
    createNote,
    createTab,
    setActiveNote,
  } = useNoteStore();

  async function handleCreateNote() {
    // Same logic as the desktop MainLayout.handleCreateNote —
    // pick the active tab, or the first tab, or create "General".
    let tabId = activeTabId ?? tabs[0]?.id ?? null;
    if (!tabId) {
      const tab = await createTab("General");
      tabId = tab.id;
    }
    if (!tabId) return;
    await createNote({ title: "Nueva nota", content: "", tabId });
  }

  function handleSelectNote(noteId: string) {
    // Mirror the URL into the store so the desktop branch (if
    // visible at >= md, e.g. window resize / Tauri desktop) sees
    // the same active note. On mobile this just keeps state
    // consistent across layout switches.
    setActiveNote(noteId);
    navigate(`/notes/${noteId}`);
  }

  // Loading state: brief inline message (the same copy as the
  // desktop list panel).
  if (isLoading) {
    return (
      <div
        data-testid="home-loading"
        className="flex h-full items-center justify-center text-sm text-text-secondary"
      >
        Cargando notas…
      </div>
    );
  }

  // Error state: inline alert — mirrors the desktop banner copy.
  if (error) {
    return (
      <div
        role="alert"
        data-testid="home-error"
        className="mx-4 mt-4 border border-danger bg-danger/10 px-3 py-2 text-xs text-danger"
      >
        {error}
      </div>
    );
  }

  // Empty state: single CTA per decisions #2207.
  if (notes.length === 0) {
    return <EmptyState onCreate={() => { void handleCreateNote(); }} />;
  }

  // Populated: render the note list. enableDrag is disabled on
  // mobile (DnD is a desktop affordance — see design #2214 and
  // REQ-LAY-03 in the spec). onToggleFavorite / onMoveToTab /
  // pagination are wired through so the same component is
  // rendered; the user just doesn't see them on the narrow
  // viewport (the row buttons are gated on visibility in
  // `NoteList.tsx`).
  return (
    <NoteList
      notes={filteredNotes()}
      tabs={tabs}
      activeNoteId={null}
      onNoteSelect={handleSelectNote}
      onCreateNote={() => { void handleCreateNote(); }}
      enableDrag={false}
      isFavoriteOnly={false}
    />
  );
}