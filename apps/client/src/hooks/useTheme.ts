import { useState, useEffect, useMemo } from "react";
import { apiClient } from "../api/client";
import { useAuthStore } from "../stores/useAuthStore";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/**
 * Pure function: resolves the effective theme from stored preference + system preference.
 * @param stored - value from localStorage or API ("light" | "dark" | "system" | null)
 * @param systemPrefersDark - result of matchMedia("prefers-color-scheme: dark")
 */
export function resolveTheme(stored: string | null, systemPrefersDark: boolean): ResolvedTheme {
  if (stored === "dark") return "dark";
  if (stored === "light") return "light";
  // "system" or null → use system
  return systemPrefersDark ? "dark" : "light";
}

/**
 * Applies the resolved theme class to document.documentElement.
 */
export function applyThemeToDocument(resolved: ResolvedTheme): void {
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }
}

const THEME_KEY = "theme";

export function useTheme() {
  const getSystemPrefersDark = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    return stored ?? "dark";
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => getSystemPrefersDark());

  // Derived — no separate state needed
  const resolvedTheme = useMemo(
    () => resolveTheme(theme, systemPrefersDark),
    [theme, systemPrefersDark]
  );

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Apply theme to DOM and persist whenever resolved changes
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
    localStorage.setItem(THEME_KEY, theme);

    // Sync with API only when authenticated (fire-and-forget)
    if (!isAuthenticated) return;
    const apiTheme = theme === "system" ? "system" : theme;
    apiClient
      .put("/api/user/preferences", { theme: apiTheme })
      .catch(() => {});
  }, [resolvedTheme, theme, isAuthenticated]);

  // Listen to system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemPrefersDark(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Initial sync from API — only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient
      .get<{ theme: string }>("/api/user/preferences")
      .then((data) => {
        if (data?.theme) {
          setThemeState(data.theme as Theme);
          localStorage.setItem(THEME_KEY, data.theme);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return { theme, resolvedTheme, setTheme };
}
