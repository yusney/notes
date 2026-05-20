import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from .env files based on mode
  const env = loadEnv(mode, process.cwd(), "");
  
  const host = env.TAURI_DEV_HOST;
  const apiBaseUrl = env.VITE_API_BASE_URL ?? "http://localhost:8080";
  
  return {
    plugins: [react(), tailwindcss()],
    clearScreen: false,
    define: {
      // Expose API base URL to the app at build time
      __API_BASE_URL__: JSON.stringify(apiBaseUrl),
    },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["**/e2e/**", "**/node_modules/**"],
  },
  };
});
