import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAuthStore } from "../stores/useAuthStore";
import { API_BASE_URL } from "../api/client";
import { PasswordInput } from "../components/ui/PasswordInput";

async function handleOAuthLogin(provider: "google" | "github") {
  await openUrl(`${API_BASE_URL}/api/auth/oauth/${provider}`);
}

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

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
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-surface-elevated border border-border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Notes</h1>
        <p className="text-sm text-text-secondary mb-6">Iniciá sesión para continuar</p>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-danger/10 border border-danger text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-surface border-b-2 border-border text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
              autoComplete="email"
              placeholder="tu@email.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
              Contraseña
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 border-border bg-surface text-accent"
            />
            <label htmlFor="remember-me" className="text-xs text-text-secondary cursor-pointer select-none">
              Recordarme
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-accent text-accent-text text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Iniciando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          ¿No tenés cuenta?{" "}
          <Link to="/register" className="text-accent hover:underline">
            Regístrate
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-text-secondary">
          <Link to="/forgot-password" className="text-accent hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-text-secondary">
              <span className="bg-surface-elevated px-2">o continuá con</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleOAuthLogin("google")}
              className="w-full py-2 px-4 border border-border text-sm font-medium text-text-primary hover:bg-surface transition-colors"
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthLogin("github")}
              className="w-full py-2 px-4 border border-border text-sm font-medium text-text-primary hover:bg-surface transition-colors"
            >
              GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
