interface FloatingActionButtonProps {
  "aria-label": string;
  onClick: () => void;
  icon?: string;
}

export function FloatingActionButton({
  "aria-label": ariaLabel,
  onClick,
  icon = "+",
}: FloatingActionButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-accent-text text-2xl hover:bg-accent-hover transition-colors duration-150 flex items-center justify-center z-50"
    >
      {icon}
    </button>
  );
}
