import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import { useOAuthLogin } from "../hooks/useOAuth";
import { PasswordInput } from "../components/ui/PasswordInput";
import { Icon } from "../components/ui/Icon";

export function LoginPage() {
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { startOAuth, isLoading: isOAuthLoading, error: oauthError, clearError: clearOAuthError } = useOAuthLogin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  function validate() {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = "El email es requerido";
    if (!password) errors.password = "La contraseña es requerida";
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await login(email, password, rememberMe);
      navigate("/");
    } catch {
      // error is set in store
    }
  }

  return (
    <div
      data-testid="login-page-root"
      className="min-h-screen flex items-center justify-center bg-surface pt-[var(--safe-top)] pb-[var(--safe-bottom)]"
    >
      <div className="bg-surface-elevated border border-border p-8 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Icon name="terminal" className="text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">Notes</h1>
        </div>
        <p className="text-sm text-text-secondary mb-6">Autenticación Requerida</p>

        {(error || oauthError) && (
          <div role="alert" className="mb-4 p-3 bg-danger/10 border border-danger text-sm text-danger">
            {error || oauthError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-surface-elevated border-b-2 border-input-border text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
                autoComplete="email"
                placeholder="tu@email.com"
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
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
            )}
          </div>

          {/* Remember me + forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line react-doctor/control-has-associated-label -- label is associated via htmlFor="remember-me" */}
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 border-border bg-surface text-accent"
              />
              <label htmlFor="remember-me" className="text-xs text-text-secondary cursor-pointer select-none">
                Recordarme
              </label>
            </div>
            <Link to="/forgot-password" className="text-xs text-accent hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-11 py-2.5 px-4 bg-accent text-accent-text text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? "Iniciando..." : "Iniciar sesión"}
            <Icon name="arrow_forward" />
          </button>
        </form>

        {/* OAuth divider */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-text-secondary">
              <span className="bg-surface-elevated px-2">Identidad Externa</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => { clearOAuthError(); startOAuth("google"); }}
              disabled={isOAuthLoading}
              className="w-full min-h-11 py-2 px-4 border border-border text-sm font-medium text-text-primary hover:bg-surface transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="data_object" className="text-text-secondary" />
              {isOAuthLoading ? "Abriendo navegador..." : "Google"}
            </button>
            <button
              type="button"
              onClick={() => { clearOAuthError(); startOAuth("github"); }}
              disabled={isOAuthLoading}
              className="w-full min-h-11 py-2 px-4 border border-border text-sm font-medium text-text-primary hover:bg-surface transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="terminal" className="text-text-secondary" />
              {isOAuthLoading ? "Abriendo navegador..." : "GitHub"}
            </button>
          </div>
        </div>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-text-secondary">
          ¿Aún no tienes acceso?{" "}
          <Link to="/register" className="text-accent hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
