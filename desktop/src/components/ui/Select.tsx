import { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function Select({
  id,
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? value;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        containerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setFocusIdx(options.findIndex((o) => o.value === value));
    }
  }

  function handleOptionClick(optValue: string) {
    onChange(optValue);
    setOpen(false);
    containerRef.current?.focus();
  }

  function handleListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((prev) => (prev + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((prev) => (prev <= 0 ? options.length - 1 : prev - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusIdx >= 0 && focusIdx < options.length) {
        handleOptionClick(options[focusIdx].value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      containerRef.current?.focus();
    }
  }

  // Scroll focused option into view
  useEffect(() => {
    if (!open || focusIdx < 0) return;
    const el = listRef.current?.children[focusIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [focusIdx, open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
        onKeyDown={handleTriggerKey}
        className="flex w-full items-center justify-between border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary transition-colors hover:border-accent/50 focus:outline-none focus:border-accent"
      >
        <span className="truncate">{label}</span>
        <span
          aria-hidden="true"
          className={`ml-2 text-xs text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={handleListKey}
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto border border-border bg-surface-elevated"
        >
          {options.map((opt, idx) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleOptionClick(opt.value)}
              onMouseEnter={() => setFocusIdx(idx)}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                opt.value === value
                  ? "bg-accent-subtle text-text-primary font-medium"
                  : focusIdx === idx
                    ? "bg-surface text-text-primary"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary"
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
