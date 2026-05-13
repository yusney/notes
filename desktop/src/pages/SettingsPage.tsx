import { useState, useEffect } from "react";
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

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    fetchPreferences,
    updatePreferences,
    isLoading: prefsLoading,
  } = usePreferencesStore();
  const [sortBy, setSortBy] = useState<SortBy>("creation");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences().then(() => {
      const prefs = usePreferencesStore.getState();
      setSortBy(prefs.sortBy);
      setSortOrder(prefs.sortOrder);
    });
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setIsSaving(true);
    try {
      await updatePreferences({ sortBy, sortOrder });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  if (prefsLoading) return <div className="p-6 text-sm text-text-secondary">Cargando...</div>;

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
            <label className="block text-sm font-medium text-text-primary">Tema</label>
            <Select
              options={THEME_OPTIONS}
              value={theme}
              onChange={(v) => setTheme(v as Theme)}
              ariaLabel="Tema"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">Ordenar por defecto</label>
            <Select
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(v) => setSortBy(v as SortBy)}
              ariaLabel="Ordenar por defecto"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">Orden</label>
            <Select
              options={ORDER_OPTIONS}
              value={sortOrder}
              onChange={(v) => setSortOrder(v as SortOrder)}
              ariaLabel="Orden de clasificación"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-accent">Configuración guardada</p>}

          <button
            onClick={handleSave}
            disabled={isSaving}
            aria-label="Guardar configuración"
            className="text-sm px-4 py-2 bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Guardando..." : "Guardar configuración"}
          </button>
        </section>
      </div>
    </div>
  );
}
