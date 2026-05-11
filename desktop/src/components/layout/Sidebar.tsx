import { Link } from "react-router-dom";
import type { Tab } from "../../types";

interface SidebarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onCreateTab: () => void;
  userName?: string;
  onLogout?: () => void;
}

export function Sidebar({ tabs, activeTabId, onTabSelect, onCreateTab, userName, onLogout }: SidebarProps) {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-surface-elevated text-text-primary">
      <div className="border-b border-border px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Notes</p>
        <p className="mt-2 text-lg font-semibold text-text-primary">Command center</p>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-text-secondary">Espacios</span>
        <button
          onClick={onCreateTab}
          aria-label="Nueva tab"
          className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-lg leading-none text-accent transition-colors hover:border-accent hover:bg-accent hover:text-accent-text"
        >
          +
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {tabs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-text-secondary">
            No hay tabs todavía. Creá un espacio para agrupar tus notas.
          </div>
        ) : (
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => onTabSelect(tab.id)}
                  aria-current={activeTabId === tab.id ? "true" : undefined}
                  className={`w-full rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${
                    activeTabId === tab.id
                      ? "bg-accent text-accent-text shadow-sm"
                      : "text-text-secondary hover:bg-surface hover:text-text-primary"
                  }`}
                >
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t border-border p-2">
        {(userName || onLogout) && (
          <div className="mb-2 rounded-2xl border border-border bg-surface/70 p-3">
            <p className="truncate text-xs font-medium text-text-secondary">Sesión activa</p>
            {userName && <p className="mt-1 truncate text-sm font-semibold text-text-primary">{userName}</p>}
            {onLogout && (
              <button
                onClick={onLogout}
                className="mt-3 w-full rounded-full border border-border px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
              >
                Cerrar sesión
              </button>
            )}
          </div>
        )}
        <Link
          to="/profile"
          aria-label="Perfil"
          className="flex items-center rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
        >
          <span className="mr-2" aria-hidden="true">👤</span> Perfil
        </Link>
        <Link
          to="/settings"
          aria-label="Configuración"
          className="flex items-center rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
        >
          <span className="mr-2" aria-hidden="true">⚙️</span> Configuración
        </Link>
      </div>
    </aside>
  );
}
