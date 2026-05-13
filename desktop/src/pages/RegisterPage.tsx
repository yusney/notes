import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import { PasswordInput } from "../components/ui/PasswordInput";

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Mínimo 8 caracteres";
  if (!/\d/.test(password)) return "Al menos 1 número";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Al menos 1 carácter especial";
  return null;
}

export function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  function validate() {
    const errors: typeof fieldErrors = {};
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
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await register(name, email, password);
      navigate("/");
    } catch {
      // error set in store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-surface-elevated border border-border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Crear cuenta</h1>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-danger/10 border border-danger text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface border-b-2 border-border text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
              autoComplete="name"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.name}</p>
            )}
          </div>

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
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-accent text-accent-text text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
