import type { ReactNode } from "react";

interface AppBarProps {
  /** Visible title text, rendered as an <h1>. */
  title: string;
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
 * Safe-area: the top safe-area inset (`--safe-top`) is applied via
 * `pt-[var(--safe-top)]` so the bar pushes its content below the OS
 * notch / camera cutout on devices that report `viewport-fit=cover`.
 *
 * Testid anchor: `data-testid="app-bar"` is exposed so downstream tests
 * (MobileShell composition, visual regression) can locate it without
 * coupling to ARIA semantics.
 */
export function AppBar({ title, leading, trailing }: AppBarProps) {
  const ariaLabel = leading ? undefined : title;
  return (
    <header
      data-testid="app-bar"
      aria-label={ariaLabel}
      className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface-elevated px-4 pt-[var(--safe-top)] min-h-11 text-text-primary"
    >
      {leading !== undefined && (
        <div data-testid="app-bar-leading" className="flex items-center">
          {leading}
        </div>
      )}
      <h1 className="flex-1 truncate text-[length:var(--type-body-sm)] font-semibold">{title}</h1>
      {trailing !== undefined && (
        <div data-testid="app-bar-trailing" className="flex items-center">
          {trailing}
        </div>
      )}
    </header>
  );
}
