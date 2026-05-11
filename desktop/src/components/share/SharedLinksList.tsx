import type { SharedLink } from "../../types";

interface SharedLinksListProps {
  links: SharedLink[];
  onRevoke: (token: string) => void;
}

export function SharedLinksList({ links, onRevoke }: SharedLinksListProps) {
  if (links.length === 0) {
    return <p className="text-sm text-text-secondary">No hay enlaces compartidos para esta nota.</p>;
  }

  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3">
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-mono text-text-secondary">{link.token}</span>
            {link.expiresAt && (
              <span className="text-xs text-text-secondary">expira: {new Date(link.expiresAt).toLocaleDateString()}</span>
            )}
          </div>
          <button
            onClick={() => onRevoke(link.token)}
            aria-label="revocar"
            className="rounded-lg border border-danger px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger hover:text-accent-text"
          >
            Revocar
          </button>
        </li>
      ))}
    </ul>
  );
}
