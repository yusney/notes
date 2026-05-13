import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { PasswordInput } from "../components/ui/PasswordInput";

interface UserProfile {
  name: string;
  email: string;
  provider: string;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    apiClient
      .get<UserProfile>("/api/user/profile")
      .then((data) => {
        setProfile(data);
        setName(data.name);
      })
      .catch(() => {});
  }, []);

  const handleSaveName = async () => {
    setNameError(null);
    setNameSuccess(false);
    try {
      await apiClient.put("/api/user/profile", { name });
      setNameSuccess(true);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    setIsLoading(true);
    try {
      await apiClient.put("/api/user/password", {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Error al cambiar contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  const isOAuth = profile && profile.provider !== "local";

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-lg mx-auto p-6 space-y-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-accent transition-colors"
        >
          ← Volver
        </Link>
        <h1 className="text-xl font-semibold text-text-primary">Perfil</h1>

        {profile && (
          <section className="space-y-4">
            <div>
              <p className="text-xs text-text-secondary mb-1">Email</p>
              <p className="text-sm text-text-primary">{profile.email}</p>
            </div>

            {profile.provider && (
              <div>
                <p className="text-xs text-text-secondary mb-1">Proveedor</p>
                <p className="text-sm text-text-primary capitalize">{profile.provider}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="display-name" className="block text-xs text-text-secondary">
                Nombre
              </label>
              <input
                id="display-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-b-2 border-input-border px-1 py-2 text-sm bg-surface-elevated text-text-primary focus:border-accent focus:outline-none"
              />
              {nameError && <p className="text-xs text-danger">{nameError}</p>}
              {nameSuccess && <p className="text-xs text-accent">Nombre guardado</p>}
              <button
                onClick={handleSaveName}
                aria-label="Guardar nombre"
                className="text-sm px-4 py-2 bg-accent text-accent-text hover:bg-accent-hover transition-colors"
              >
                Guardar nombre
              </button>
            </div>
          </section>
        )}

        {!isOAuth && (
          <section className="space-y-4">
            <h2 className="text-base font-medium text-text-primary">Cambiar contraseña</h2>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label htmlFor="current-password" className="block text-xs text-text-secondary mb-1">
                  Contraseña actual
                </label>
                <PasswordInput
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-xs text-text-secondary mb-1">
                  Nueva contraseña
                </label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              {passwordError && <p className="text-xs text-danger">{passwordError}</p>}
              {passwordSuccess && <p className="text-xs text-accent">Contraseña cambiada</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="text-sm px-4 py-2 bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
