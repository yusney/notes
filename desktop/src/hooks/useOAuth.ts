import { useEffect, useState } from "react";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAuthStore } from "../stores/useAuthStore";
import { API_BASE_URL } from "../api/client";

/**
 * Handles OAuth login via the OS browser + deep link callback.
 *
 * Flow:
 *   1. openUrl() → OS browser → Google → backend
 *   2. Backend redirects to notes://auth/callback?code=...
 *   3. OS routes the custom scheme to the app
 *   4. Tauri deep-link plugin delivers the URL to this hook
 *   5. This hook exchanges the one-time code over HTTPS and calls loginWithOAuth()
 */
export function useOAuthLogin() {
  const { loginWithOAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleUrls(urls: string[] | null) {
      if (!urls) return;

      try {
        const callbackUrl = urls.find((url) => url.startsWith("notes://auth/callback"));
        if (!callbackUrl) return;

        const url = new URL(callbackUrl);
        const oauthError = url.searchParams.get("error");
        const code = url.searchParams.get("code");

        if (oauthError) {
          throw new Error(decodeURIComponent(oauthError));
        }

        if (!code) {
          throw new Error("OAuth callback code is missing");
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/oauth/desktop/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error("No se pudo completar el inicio de sesión con OAuth");
        }

        const { accessToken, refreshToken } = await response.json() as {
          accessToken?: string;
          refreshToken?: string;
        };

        if (!accessToken || !refreshToken) {
          throw new Error("OAuth token exchange response is invalid");
        }

        await loginWithOAuth(accessToken, refreshToken);
      } catch (err) {
        console.error("[OAuth] Callback error:", err);
        setError(err instanceof Error ? err.message : "Error en el callback de OAuth");
      } finally {
        setIsLoading(false);
      }
    }

    // Handles app launch via `notes://...` and future deep-link events.
    getCurrent().then(handleUrls).catch((err) => {
      console.error("[OAuth] Failed to read current deep link:", err);
    });

    const unlisten = onOpenUrl(handleUrls);

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loginWithOAuth]);

  const startOAuth = async (provider: "google" | "github") => {
    setIsLoading(true);
    setError(null);
    try {
      await openUrl(`${API_BASE_URL}/api/auth/oauth/${provider}`);
    } catch (err) {
      console.error("[OAuth] Failed to open browser:", err);
      setError("No se pudo abrir el navegador");
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { startOAuth, isLoading, error, clearError };
}
