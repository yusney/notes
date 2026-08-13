import { useReducer, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import { PasswordInput } from "../components/ui/PasswordInput";
import { Icon } from "../components/ui/Icon";

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Mínimo 8 caracteres";
  if (!/\d/.test(password)) return "Al menos 1 número";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Al menos 1 carácter especial";
  return null;
}

interface RegisterState {
  name: string;
  email: string;
  password: string;
  rememberMe: boolean;
  fieldErrors: { name?: string; email?: string; password?: string };
}

type RegisterAction =
  | { type: "set-name"; value: string }
  | { type: "set-email"; value: string }
  | { type: "set-password"; value: string }
  | { type: "set-remember-me"; value: boolean }
  | { type: "set-field-errors"; value: RegisterState["fieldErrors"] };

const INITIAL_STATE: RegisterState = {
  name: "",
  email: "",
  password: "",
  rememberMe: true,
  fieldErrors: {},
};

function registerReducer(state: RegisterState, action: RegisterAction): RegisterState {
  switch (action.type) {
    case "set-name": return { ...state, name: action.value };
    case "set-email": return { ...state, email: action.value };
    case "set-password": return { ...state, password: action.value };
    case "set-remember-me": return { ...state, rememberMe: action.value };
    case "set-field-errors": return { ...state, fieldErrors: action.value };
  }
}

export function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(registerReducer, INITIAL_STATE);
  const { name, email, password, rememberMe, fieldErrors } = state;

  function validate() {
    const errors: RegisterState["fieldErrors"] = {};
    if (!name.trim()) errors.name = "El nombre es requerido";
    if (!email.trim()) errors.email = "El email es requerido";
    const pwError = validatePassword(password);
    if (pwError) errors.password = pwError;
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const errors = validate();
    dispatch({ type: "set-field-errors", value: errors });
    if (Object.keys(errors).length > 0) return;

    try {
      await register(name, email, password, rememberMe);
      navigate("/");
    } catch {
      // error set in store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-surface-elevated border border-input-border p-8 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Icon name="terminal" className="text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">Notes</h1>
        </div>
        <p className="text-sm text-text-secondary mb-6">Crear cuenta</p>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-danger/10 border border-danger text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
              Nombre
            </label>
            <div className="relative">
              <Icon name="person" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              {/* eslint-disable-next-line react-doctor/control-has-associated-label -- label is associated via htmlFor="name" */}
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => dispatch({ type: "set-name", value: e.target.value })}
                className="w-full pl-10 pr-3 py-2 bg-surface-elevated border-b-2 border-input-border text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
                autoComplete="name"
              />
            </div>
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Icon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              {/* eslint-disable-next-line react-doctor/control-has-associated-label -- label is associated via htmlFor="email" */}
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => dispatch({ type: "set-email", value: e.target.value })}
                className="w-full pl-10 pr-3 py-2 bg-surface-elevated border-b-2 border-input-border text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
              Contraseña
            </label>
            <PasswordInput
              id="password"
              icon="lock"
              value={password}
              onChange={(e) => dispatch({ type: "set-password", value: e.target.value })}
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line react-doctor/control-has-associated-label -- label is associated via htmlFor="remember-me" */}
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => dispatch({ type: "set-remember-me", value: e.target.checked })}
              className="size-4 border-border bg-surface text-accent"
            />
            <label htmlFor="remember-me" className="text-xs text-text-secondary cursor-pointer select-none">
              Mantener sesión iniciada
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-accent text-accent-text text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? "Registrando..." : "Registrarse"}
            <Icon name="arrow_forward" />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
