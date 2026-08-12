import type { ReactNode } from "react";

interface AppBarProps {
  /**
   * Title slot. Accepts a string (rendered as <h1>) or any ReactNode
   * (rendered inline). The flex-1 wrapper means the slot takes all
   * available width between the leading and trailing slots, so a
   * SearchBar passed as the title renders at the same Y as the
   * hamburger / back chevron — the same row, not a separate row below.
   *
   * When `undefined` or empty string, the slot collapses (no <h1>); a
   * spacer is rendered in its place to keep the trailing slot
   * right-aligned.
   */
  title?: ReactNode;
  /**
   * Optional leading slot (typically a back chevron or hamburger). When
   * omitted, the <header> advertises itself with `aria-label={title}` so
   * screen readers can still identify the bar.
   */
  leading?: ReactNode;
  /**
   * Optional trailing slot (typically a hamburger or action icons).
   */
  trailing?: ReactNode;
}

/**
 * AppBar — mobile top bar with safe-area notch handling.
 *
 * Mount: always; the caller (PR2 `MobileShell`) decides visibility by
 * wrapping it in a `md:hidden` mount. AppBar itself is mount-agnostic.
 *
 * Safe-area: the outer <header> owns the top safe-area inset and the
 * inner row owns the visual 56px toolbar height. Keeping those two
 * responsibilities separate avoids Android WebView stretching or
 * mis-centering the hamburger/title row when `env(safe-area-inset-top)`
 * reports an oversized cutout value.
 *
 * Testid anchor: `data-testid="app-bar"` is exposed so downstream tests
 * (MobileShell composition, visual regression) can locate it without
 * coupling to ARIA semantics.
 */
export function AppBar({ title, leading, trailing }: AppBarProps) {
  // When the title is empty (e.g. /notes/:id, where the NoteViewer
  // header below shows the actual note title), skip the title slot
  // entirely so the AppBar doesn't render an invisible-but-spaced
  // heading that pushes the rest of the screen down. The aria-label
  // falls back to a string-coerced title only when there's no leading
  // slot — since the current caller (MobileShell) always passes a
  // leading slot for the empty-title routes, the header's accessible
  // name comes from the content region below the bar.
  //
  // Title can be either a string (rendered as <h1>) or a ReactNode
  // (e.g. a SearchBar) — both are valid. When it's a node we just
  // render it inline; when it's a string we wrap in <h1> for
  // semantic landmarks.
  const titleIsString = typeof title === "string" || title === undefined;
  const titleText = titleIsString ? (title as string | undefined) : undefined;
  const ariaLabel = leading ? undefined : titleText || undefined;
  return (
    <header
      data-testid="app-bar"
      aria-label={ariaLabel}
      className="sticky top-0 z-10 shrink-0 border-b border-border bg-surface-elevated px-4 pt-[var(--safe-top)] text-text-primary"
    >
      <div data-testid="app-bar-row" className="flex h-14 items-center gap-3">
        {leading !== undefined && (
          <div data-testid="app-bar-leading" className="flex items-center">
            {leading}
          </div>
        )}
        {titleIsString && titleText && (
          <h1 className="flex-1 truncate text-[length:var(--type-body-sm)] font-semibold">{titleText}</h1>
        )}
        {titleIsString && !titleText && leading !== undefined && (
          // Spacer so the trailing slot (if any) stays right-aligned
          // when the title is absent.
          <div className="flex-1" />
        )}
        {!titleIsString && (
          // ReactNode title (e.g. SearchBar) — render inline in the
          // same flex row as the leading button so they share the same Y.
          <div data-testid="app-bar-title-slot" className="flex min-w-0 flex-1 items-center">
            {title}
          </div>
        )}
        {trailing !== undefined && (
          <div data-testid="app-bar-trailing" className="flex items-center">
            {trailing}
          </div>
        )}
        </div>
    </header>
  );
}
