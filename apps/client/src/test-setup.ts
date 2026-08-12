import "@testing-library/jest-dom";
import { vi } from "vitest";

// Polyfill HTMLDialogElement.showModal() and close() for JSDOM
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
    const event = new Event("show", { bubbles: true });
    this.dispatchEvent(event);
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    const event = new Event("close", { bubbles: true });
    this.dispatchEvent(event);
  };
}

// Mock Tauri APIs
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((cmd: string) => {
    // Keychain commands used by useAuthStore
    if (cmd === "load_token") return Promise.resolve(null);
    if (cmd === "save_token") return Promise.resolve();
    if (cmd === "delete_token") return Promise.resolve();
    return Promise.resolve();
  }),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(vi.fn())),
  emit: vi.fn(() => Promise.resolve()),
}));

vi.mock("@tauri-apps/plugin-deep-link", () => ({
  getCurrent: vi.fn(() => Promise.resolve(null)),
  onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
}));

// Mock window.matchMedia (required by useTheme)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});
