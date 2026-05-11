import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";

type PageState = "idle" | "loading" | "success" | "error";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldError(null);

    if (!email.trim()) {
      setFieldError("El email es requerido");
      return;
    }

    setPageState("loading");
    try {
      await apiClient.post("/api/auth/forgot-password", { email });
      setPageState("success");
    } catch {
      setPageState("error");
    }
  }

  if (pageState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="bg-surface-elevated border border-border p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Revisá tu email</h1>
          <p className="text-sm text-text-secondary mb-6">
            Si tu email está registrado, recibirás un enlace para restablecer tu contraseña.
          </p>
          <Link to="/login" className="text-accent hover:underline text-sm">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-surface-elevated border border-border p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Recuperar contraseña</h1>

        {pageState === "error" && (
          <div role="alert" className="mb-4 p-3 bg-danger/10 border border-danger rounded-lg text-sm text-danger">
            Ocurrió un error. Intentá de nuevo más tarde.
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
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              autoComplete="email"
            />
            {fieldError && (
              <p className="mt-1 text-xs text-danger">{fieldError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pageState === "loading"}
            className="w-full py-2 px-4 bg-accent text-accent-text rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pageState === "loading" ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          <Link to="/login" className="text-accent hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
