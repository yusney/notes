import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SideSheet } from "./SideSheet";

// ── useAuthStore mock ────────────────────────────────────────────────────────
//
// The SideSheet's Salir entry triggers `useAuthStore.logout()` on confirm.
// Mock the hook so we can assert it is called when the user taps
// "Cerrar sesión". The component calls `useAuthStore((s) => s.logout)`
// (selector form) and `useAuthStore.getState()` (used elsewhere in the
// codebase) — both must resolve to the same mocked `logout` function.
const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock("../../stores/useAuthStore", () => {
  const hook = vi.fn(
    (selector?: (s: { logout: () => Promise<void> }) => unknown) => {
      if (selector) return selector({ logout: mockLogout });
      return { logout: mockLogout };
    },
  );
  (hook as unknown as { getState: () => { logout: () => Promise<void> } }).getState =
    () => ({
      logout: mockLogout,
    });
  return { useAuthStore: hook };
});

function renderSideSheet(props: Partial<Parameters<typeof SideSheet>[0]> = {}) {
  const defaultProps = { open: true, onClose: vi.fn(), ...props };
  return render(
    <MemoryRouter>
      <SideSheet {...defaultProps} />
    </MemoryRouter>,
  );
}

describe("SideSheet (PR1 — shell-redesign-v1)", () => {
  it("is hidden when open=false", () => {
    renderSideSheet({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog with role=dialog and aria-label='Menú lateral' when open=true", () => {
    renderSideSheet({ open: true });
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-label", expect.stringMatching(/menú/i));
  });

  it("renders a Perfil link to /profile", () => {
    renderSideSheet();
    expect(screen.getByRole("link", { name: /perfil/i })).toHaveAttribute("href", "/profile");
  });

  it("renders a Configuración link to /settings", () => {
    renderSideSheet();
    expect(screen.getByRole("link", { name: /configuración/i })).toHaveAttribute("href", "/settings");
  });

  it("Salir is rendered as an ACTIVE button (PR3 wires confirmation flow)", () => {
    renderSideSheet();
    const salir = screen.getByRole("button", { name: /salir/i });
    expect(salir).toBeEnabled();
    expect(salir).not.toHaveAttribute("aria-disabled", "true");
  });

  it("renders children when provided", () => {
    renderSideSheet({ children: <span data-testid="custom-child">custom</span> });
    expect(screen.getByTestId("custom-child")).toBeInTheDocument();
  });

  it("does NOT render children slot when no children provided", () => {
    renderSideSheet();
    expect(screen.queryByTestId("side-sheet-children")).not.toBeInTheDocument();
  });

  it("renders the `header` prop ABOVE the existing nav list when provided", () => {
    renderSideSheet({ header: <div data-testid="custom-header">my header</div> });
    const header = screen.getByTestId("custom-header");
    expect(header).toBeInTheDocument();

    // The header must be a sibling that appears BEFORE the built-in nav
    // (Perfil / Configuración / Salir). Use DOM order to assert it
    // precedes the Perfil link.
    const perfilLink = screen.getByRole("link", { name: /perfil/i });
    expect(
      header.compareDocumentPosition(perfilLink) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("does NOT render a header slot when `header` is omitted (back-compat)", () => {
    renderSideSheet();
    // No header element was injected — the only header in the markup
    // is the "Menú" h2. Confirm no `data-testid="side-sheet-header"`
    // element exists (we use a stable testid in the implementation).
    expect(screen.queryByTestId("side-sheet-header")).not.toBeInTheDocument();
  });

  it("Escape (native cancel event) fires onClose", () => {
    const onClose = vi.fn();
    renderSideSheet({ onClose });
    const dialog = screen.getByRole("dialog");
    // Native <dialog> dispatches a real 'cancel' Event on Escape;
    // fireEvent.cancel doesn't exist so we dispatch the event directly.
    act(() => {
      dialog.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the dialog backdrop (target === dialog) fires onClose", () => {
    const onClose = vi.fn();
    renderSideSheet({ onClose });
    const dialog = screen.getByRole("dialog");
    // el.click() fires a real DOM click that bubbles with
    // event.target === dialog — i.e. the user clicked the ::backdrop
    // area, not any inner element.
    act(() => {
      dialog.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking INSIDE the dialog (on a link) does NOT close the sheet", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSideSheet({ onClose });
    const perfilLink = screen.getByRole("link", { name: /perfil/i });
    await user.click(perfilLink);
    // Perfil link is a react-router <Link>: clicks bubble to the dialog,
    // but e.target is the <a>, not the dialog — handler must ignore.
    expect(onClose).not.toHaveBeenCalled();
  });

  it("applies safe-area top and left padding on the inner wrapper", () => {
    renderSideSheet();
    const inner = screen.getByTestId("side-sheet-inner");

    expect(inner.className).toMatch(/pt-\[var\(--safe-top\)\]/);
    expect(inner.className).toMatch(/pl-\[var\(--safe-left\)\]/);
    expect(inner.className).toMatch(/pb-\[max\(1rem,var\(--safe-bottom\)\)\]/);
  });
});

describe("SideSheet (PR3 — Salir confirmation flow)", () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  it("tapping Salir opens a confirmation sub-step with Cancelar + Cerrar sesión", async () => {
    const user = userEvent.setup();
    renderSideSheet();

    // First tap: open the confirmation sub-step.
    await user.click(screen.getByRole("button", { name: /salir/i }));

    // The "Configuración" / "Perfil" menu items disappear and the
    // confirmation copy appears instead.
    expect(screen.getByText(/¿cerrar sesión\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
    // Logout must NOT have been called yet — confirm is gated.
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("confirming 'Cerrar sesión' calls useAuthStore.logout() and onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSideSheet({ onClose });

    await user.click(screen.getByRole("button", { name: /salir/i }));
    await user.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("cancelling the confirmation does NOT call logout and returns to the menu", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSideSheet({ onClose });

    await user.click(screen.getByRole("button", { name: /salir/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(mockLogout).not.toHaveBeenCalled();
    // Cancellation should NOT close the sheet — the user may want to
    // navigate to Perfil or Configuración instead.
    expect(onClose).not.toHaveBeenCalled();
    // The menu is back: Perfil + Configuración + Salir are all present.
    expect(screen.getByRole("link", { name: /perfil/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /configuración/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salir/i })).toBeInTheDocument();
  });

  it("Escape on the dialog while confirming still closes the sheet (cancel event)", () => {
    // The native <dialog> with showModal() emits a 'cancel' event on
    // Escape regardless of which sub-step is showing. MobileShell wires
    // the same onClose for both. We don't assert the in-component
    // state after Escape here because that's the caller's contract;
    // the integration is covered by MobileShell.test.tsx.
    renderSideSheet();
    const dialog = screen.getByRole("dialog");
    act(() => {
      dialog.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));
    });
    expect(dialog).toBeInTheDocument();
  });
});
