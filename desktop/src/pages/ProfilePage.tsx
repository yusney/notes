import { useReducer, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { PasswordInput } from "../components/ui/PasswordInput";
import { MobileShell } from "../components/layout/MobileShell";
import { MobilePageFrame } from "../components/layout/MobilePageFrame";
import { useIsMobileViewport } from "../hooks/useIsMobileViewport";

interface UserProfile {
  name: string;
  email: string;
  provider: string;
}

interface ProfileState {
  profile: UserProfile | null;
  name: string;
  nameSuccess: boolean;
  nameError: string | null;
  currentPassword: string;
  newPassword: string;
  passwordSuccess: boolean;
  passwordError: string | null;
  isLoading: boolean;
}

type ProfileAction =
  | { type: "set-profile"; value: UserProfile }
  | { type: "set-name"; value: string }
  | { type: "name-success" }
  | { type: "name-error"; value: string }
  | { type: "set-current-password"; value: string }
  | { type: "set-new-password"; value: string }
  | { type: "password-success" }
  | { type: "password-error"; value: string }
  | { type: "set-loading"; value: boolean };

const INITIAL_STATE: ProfileState = {
  profile: null,
  name: "",
  nameSuccess: false,
  nameError: null,
  currentPassword: "",
  newPassword: "",
  passwordSuccess: false,
  passwordError: null,
  isLoading: false,
};

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case "set-profile": return { ...state, profile: action.value, name: action.value.name };
    case "set-name": return { ...state, name: action.value };
    case "name-success": return { ...state, nameSuccess: true, nameError: null };
    case "name-error": return { ...state, nameSuccess: false, nameError: action.value };
    case "set-current-password": return { ...state, currentPassword: action.value };
    case "set-new-password": return { ...state, newPassword: action.value };
    case "password-success": return { ...state, passwordSuccess: true, passwordError: null, currentPassword: "", newPassword: "" };
    case "password-error": return { ...state, passwordSuccess: false, passwordError: action.value };
    case "set-loading": return { ...state, isLoading: action.value };
  }
}

export function ProfilePage() {
  const [state, dispatch] = useReducer(profileReducer, INITIAL_STATE);
  const { profile, name, nameSuccess, nameError, currentPassword, newPassword, passwordSuccess, passwordError, isLoading } = state;

  // PR3 — detect mobile viewport to wrap content in MobileShell (AppBar
  // with back chevron + BottomNav + SideSheet). Desktop layout stays
  // untouched (REQ-LAY-01). We use matchMedia with a state listener so
  // the layout responds to viewport changes (e.g. dev-tools resize,
  // foldables, browser zoom toggle) instead of being a one-shot
  // measurement at mount.
  const isMobile = useIsMobileViewport();

  useEffect(() => {
    apiClient
      .get<UserProfile>("/api/user/profile")
      .then((data) => dispatch({ type: "set-profile", value: data }))
      .catch(() => {});
  }, []);

  const handleSaveName = async () => {
    dispatch({ type: "name-error", value: "" });
    try {
      await apiClient.put("/api/user/profile", { name });
      dispatch({ type: "name-success" });
    } catch (err) {
      dispatch({ type: "name-error", value: err instanceof Error ? err.message : "Error al guardar" });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "password-error", value: "" });
    dispatch({ type: "set-loading", value: true });
    try {
      await apiClient.put("/api/user/password", { currentPassword, newPassword });
      dispatch({ type: "password-success" });
    } catch (err) {
      dispatch({ type: "password-error", value: err instanceof Error ? err.message : "Error al cambiar contraseña" });
    } finally {
      dispatch({ type: "set-loading", value: false });
    }
  };

  const isOAuth = profile && profile.provider !== "local";

  // PR3 — mobile wrapper. On mobile we mount the entire content inside
  // <MobileShell> so the user gets the AppBar (with back chevron) +
  // BottomNav + SideSheet chrome. The desktop text "← Volver" link is
  // omitted because the AppBar's back chevron already serves that
  // purpose — rendering both would be a duplicate affordance.
  const pageBody = (
    <MobilePageFrame testId="profile-page-body">
      <div className="space-y-8">
        {!isMobile && (
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-accent transition-colors"
          >
            ← Volver
          </Link>
        )}
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
              {/* eslint-disable-next-line react-doctor/control-has-associated-label -- label is associated via htmlFor="display-name" */}
              <input
                id="display-name"
                type="text"
                value={name}
                onChange={(e) => dispatch({ type: "set-name", value: e.target.value })}
                className="w-full border-b-2 border-input-border px-1 py-2 text-sm bg-surface-elevated text-text-primary focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              {nameError && <p className="text-xs text-danger">{nameError}</p>}
              {nameSuccess && <p className="text-xs text-accent">Nombre guardado</p>}
              <button
                type="button"
                onClick={handleSaveName}
                aria-label="Guardar nombre"
                className="text-sm px-4 py-2 bg-accent text-accent-text hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                  onChange={(e) => dispatch({ type: "set-current-password", value: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-xs text-text-secondary mb-1">
                  Nueva contraseña
                </label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => dispatch({ type: "set-new-password", value: e.target.value })}
                />
              </div>
              {passwordError && <p className="text-xs text-danger">{passwordError}</p>}
              {passwordSuccess && <p className="text-xs text-accent">Contraseña cambiada</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="text-sm px-4 py-2 bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {isLoading ? "Guardando…" : "Cambiar contraseña"}
              </button>
            </form>
          </section>
        )}
      </div>
    </MobilePageFrame>
  );

  return isMobile ? <MobileShell>{pageBody}</MobileShell> : pageBody;
}
