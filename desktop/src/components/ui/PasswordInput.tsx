import { useState } from "react";
import { Icon, type IconName } from "./Icon";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  ariaLabel?: string;
  icon?: IconName;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  ariaLabel,
  icon,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {icon && (
        <Icon
          name={icon}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
        />
      )}
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        className={`w-full py-2 bg-surface-elevated border-b-2 border-input-border text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent pr-10 ${icon ? "pl-10" : "px-3"}`}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors text-sm px-1"
      >
        {visible ? "🙈" : "👁"}
      </button>
    </div>
  );
}
