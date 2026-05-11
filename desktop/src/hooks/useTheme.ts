import { useState, useEffect } from "react";
import { apiClient } from "../api/client";

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
  } else {
    document.documentElement.classList.remove("dark");
  }
}

const THEME_KEY = "theme";

export function useTheme() {
  const getSystemPrefersDark = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    return stored ?? "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return resolveTheme(stored, getSystemPrefersDark());
  });

  useEffect(() => {
    const resolved = resolveTheme(theme, getSystemPrefersDark());
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved);
    localStorage.setItem(THEME_KEY, theme);

    // Sync with API (fire-and-forget)
    const apiTheme = theme === "system" ? "system" : theme;
    apiClient
      .put("/api/user/preferences", { theme: apiTheme })
      .catch(() => {});
  }, [theme]);

  // Listen to system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const resolved = resolveTheme("system", mq.matches);
        setResolvedTheme(resolved);
        applyThemeToDocument(resolved);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // Initial sync from API
  useEffect(() => {
    apiClient
      .get<{ theme: string }>("/api/user/preferences")
      .then((data) => {
        if (data?.theme) {
          setThemeState(data.theme as Theme);
          localStorage.setItem(THEME_KEY, data.theme);
          const resolved = resolveTheme(data.theme, getSystemPrefersDark());
          setResolvedTheme(resolved);
          applyThemeToDocument(resolved);
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return { theme, resolvedTheme, setTheme };
}
