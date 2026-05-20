import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { configureApiClient, loadRuntimeConfig } from "../../api/client";

interface AuthProviderProps {
  children: ReactNode;
}

function LoadingScreen({ message = "Restaurando sesión..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="text-center">
        <div className="mx-auto mb-6 h-3 w-48 overflow-hidden rounded-full bg-border">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-accent/60" />
        </div>
        <p className="text-sm font-medium text-text-secondary">{message}</p>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isInitialized, isAuthenticated } = useAuthStore();
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    // Load runtime config first, then wire up the API client
    loadRuntimeConfig().then(() => {
      configureApiClient(
        () => useAuthStore.getState().accessToken,
        () => useAuthStore.getState().refreshAccessToken()
      );
      setConfigLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!configLoaded) return;
    // On mount only — initialize is stable from zustand but we pin with empty deps to be safe
    useAuthStore.getState().initialize();
  }, [configLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the apiClient's unauthorized handler reactive when token refreshes
  const hasAuth = isAuthenticated;
  useEffect(() => {
    if (hasAuth) {
      configureApiClient(
        () => useAuthStore.getState().accessToken,
        () => useAuthStore.getState().refreshAccessToken()
      );
    }
  }, [hasAuth]);

  if (!configLoaded || !isInitialized) {
    return <LoadingScreen message={configLoaded ? "Restaurando sesión..." : "Cargando configuración..."} />;
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
