import type { ReactNode } from "react";

interface MobilePageFrameProps {
  children: ReactNode;
  testId: string;
  className?: string;
  contentClassName?: string;
}

/**
 * Shared mobile page surface for content that lives inside MobileShell.
 *
 * Keeps the outer scroll container, centered width, and vertical rhythm
 * consistent across mobile-only pages like Profile and Settings without
 * repeating the same wrapper classes in every view.
 */
export function MobilePageFrame({
  children,
  testId,
  className = "",
  contentClassName = "space-y-8",
}: MobilePageFrameProps) {
  return (
    <div
      data-testid={testId}
      className={`min-h-full overflow-y-auto bg-surface ${className}`.trim()}
    >
      <div
        className={`mx-auto flex w-full max-w-lg flex-col px-4 py-6 sm:px-6 ${contentClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}
