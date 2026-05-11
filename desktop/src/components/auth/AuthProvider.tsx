import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { configureApiClient } from "../../api/client";

interface AuthProviderProps {
  children: ReactNode;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="text-center">
        <div className="mx-auto mb-6 h-3 w-48 overflow-hidden rounded-full bg-border">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-accent/60" />
        </div>
        <p className="text-sm font-medium text-text-secondary">Restaurando sesión...</p>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isInitialized, isAuthenticated, initialize, refreshAccessToken } = useAuthStore();

  useEffect(() => {
    // Wire up the API client token getter and unauthorized handler
    configureApiClient(
      () => useAuthStore.getState().accessToken,
      () => useAuthStore.getState().refreshAccessToken()
    );
  }, []);

  useEffect(() => {
    // On mount, try to restore persisted session
    initialize();
  }, [initialize]);

  // Keep the apiClient's unauthorized handler reactive when token refreshes
  const hasAuth = isAuthenticated;
  useEffect(() => {
    if (hasAuth) {
      configureApiClient(
        () => useAuthStore.getState().accessToken,
        () => useAuthStore.getState().refreshAccessToken()
      );
    }
  }, [hasAuth, refreshAccessToken]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const location = useLocation();

  // Don't redirect while still initializing (prevents flash to login)
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
