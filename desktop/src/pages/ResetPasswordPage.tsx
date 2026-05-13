import { useState, useEffect, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { PasswordInput } from "../components/ui/PasswordInput";

type PageState = "validating" | "invalid" | "ready" | "loading" | "error";

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Mínimo 8 caracteres";
  if (!/\d/.test(password)) return "Al menos 1 número";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Al menos 1 carácter especial";
  return null;
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>(token ? "validating" : "invalid");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    apiClient
      .get<{ isValid: boolean }>(`/api/auth/validate-reset-token?token=${token}`)
      .then((data) => {
        if (data?.isValid) {
          setPageState("ready");
        } else {
          setPageState("invalid");
        }
      })
      .catch(() => {
        setPageState("invalid");
      });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const pwError = validatePassword(password);
    if (pwError) {
      setFieldError(pwError);
      return;
    }

    setPageState("loading");
    try {
      await apiClient.post("/api/auth/reset-password", { token, newPassword: password });
      navigate("/login");
    } catch {
      setPageState("error");
    }
  }

  if (pageState === "validating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="bg-surface-elevated border border-border p-8 w-full max-w-sm text-center">
          <p className="text-sm text-text-secondary">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="bg-surface-elevated border border-border p-8 w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Enlace inválido</h1>
          <p className="text-sm text-text-secondary mb-6">
            Este enlace es inválido o ha expirado. Solicitá uno nuevo.
          </p>
          <Link to="/forgot-password" className="text-accent hover:underline text-sm">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-surface-elevated border border-border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Nueva contraseña</h1>

        {pageState === "error" && (
          <div role="alert" className="mb-4 p-3 bg-danger/10 border border-danger text-sm text-danger">
            Ocurrió un error. Intentá de nuevo.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
              Nueva contraseña
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {fieldError && (
              <p className="mt-1 text-xs text-danger">{fieldError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pageState === "loading"}
            className="w-full py-2 px-4 bg-accent text-accent-text text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pageState === "loading" ? "Restableciendo..." : "Restablecer contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
