import { useReducer, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import type { Theme } from "../hooks/useTheme";
import { usePreferencesStore, type SortBy, type SortOrder } from "../stores/usePreferencesStore";
import { Select } from "../components/ui/Select";

const THEME_OPTIONS = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "creation", label: "Fecha de creación" },
  { value: "modification", label: "Última modificación" },
  { value: "alphabetical", label: "Alfabético" },
];

const ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "desc", label: "Descendente" },
  { value: "asc", label: "Ascendente" },
];

interface SettingsState {
  sortBy: SortBy;
  sortOrder: SortOrder;
  isSaving: boolean;
  success: boolean;
  error: string | null;
}

type SettingsAction =
  | { type: "set-prefs"; sortBy: SortBy; sortOrder: SortOrder }
  | { type: "set-sort-by"; value: SortBy }
  | { type: "set-sort-order"; value: SortOrder }
  | { type: "save-start" }
  | { type: "save-success" }
  | { type: "save-error"; value: string };

const INITIAL_STATE: SettingsState = {
  sortBy: "creation",
  sortOrder: "desc",
  isSaving: false,
  success: false,
  error: null,
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case "set-prefs": return { ...state, sortBy: action.sortBy, sortOrder: action.sortOrder };
    case "set-sort-by": return { ...state, sortBy: action.value };
    case "set-sort-order": return { ...state, sortOrder: action.value };
    case "save-start": return { ...state, isSaving: true, success: false, error: null };
    case "save-success": return { ...state, isSaving: false, success: true };
    case "save-error": return { ...state, isSaving: false, error: action.value };
  }
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { fetchPreferences, updatePreferences, isLoading: prefsLoading } = usePreferencesStore();
  const [state, dispatch] = useReducer(settingsReducer, INITIAL_STATE);
  const { sortBy, sortOrder, isSaving, success, error } = state;

  /* eslint-disable react-doctor/exhaustive-deps -- fetchPreferences is a stable Zustand action, adding it would cause infinite re-runs */
  useEffect(() => {
    fetchPreferences().then(() => {
      const prefs = usePreferencesStore.getState();
      dispatch({ type: "set-prefs", sortBy: prefs.sortBy, sortOrder: prefs.sortOrder });
    });
  }, []);
  /* eslint-enable react-doctor/exhaustive-deps */

  const handleSave = async () => {
    dispatch({ type: "save-start" });
    try {
      await updatePreferences({ sortBy, sortOrder });
      dispatch({ type: "save-success" });
    } catch (err) {
      dispatch({ type: "save-error", value: err instanceof Error ? err.message : "Error al guardar" });
    }
  };

  if (prefsLoading) return <div className="p-6 text-sm text-text-secondary">Cargando…</div>;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-lg mx-auto p-6 space-y-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-accent transition-colors"
        >
          ← Volver
        </Link>
        <h1 className="text-xl font-semibold text-text-primary">Configuración</h1>

        <section className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="select-theme" className="block text-sm font-medium text-text-primary">Tema</label>
            <Select
              id="select-theme"
              options={THEME_OPTIONS}
              value={theme}
              onChange={(v) => setTheme(v as Theme)}
              ariaLabel="Tema"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="select-sort-by" className="block text-sm font-medium text-text-primary">Ordenar por defecto</label>
            <Select
              id="select-sort-by"
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(v) => dispatch({ type: "set-sort-by", value: v as SortBy })}
              ariaLabel="Ordenar por defecto"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="select-sort-order" className="block text-sm font-medium text-text-primary">Orden</label>
            <Select
              id="select-sort-order"
              options={ORDER_OPTIONS}
              value={sortOrder}
              onChange={(v) => dispatch({ type: "set-sort-order", value: v as SortOrder })}
              ariaLabel="Orden de clasificación"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-accent">Configuración guardada</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            aria-label="Guardar configuración"
            className="text-sm px-4 py-2 bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Guardando…" : "Guardar configuración"}
          </button>
        </section>
      </div>
    </div>
  );
}
