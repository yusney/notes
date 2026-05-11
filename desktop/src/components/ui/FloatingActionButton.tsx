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
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-accent-text text-2xl shadow-lg hover:bg-accent-hover hover:scale-110 transition-all duration-200 flex items-center justify-center z-50"
    >
      {icon}
    </button>
  );
}
