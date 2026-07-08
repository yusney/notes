import { Component, type ErrorInfo, type ReactNode } from "react";

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

/**
 * RouteErrorBoundary (REQ-PERF-02)
 *
 * Class component (required for error boundaries — no hook equivalent).
 * Catches thrown errors inside lazy route chunks and renders a
 * recoverable error UI with a retry button. Only wraps the lazy
 * subtree, so a chunk failure does NOT replace the global app shell.
 *
 * The retry button resets `error` to null; React then re-mounts the
 * children, which re-triggers the lazy chunk fetch. React's module
 * cache means a previously-loaded chunk resolves immediately.
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console -- diagnostic only, intentional
    console.error("RouteErrorBoundary caught:", error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <RouteErrorFallback error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

interface RouteErrorFallbackProps {
  error: Error;
  onRetry: () => void;
}

function RouteErrorFallback({ error, onRetry }: RouteErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-8 text-center"
    >
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          No pudimos cargar esta vista
        </h2>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          {error.message || "Ocurrió un error inesperado al cargar el contenido."}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="bg-accent px-5 py-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
      >
        Reintentar
      </button>
    </div>
  );
}
