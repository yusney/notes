import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SideSheet } from "./SideSheet";

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

  it("Salir is rendered as a DISABLED placeholder (PR3 wires confirmation flow)", () => {
    renderSideSheet();
    const salir = screen.getByRole("button", { name: /salir/i });
    expect(salir).toBeDisabled();
    expect(salir).toHaveAttribute("aria-disabled", "true");
  });

  it("renders children when provided", () => {
    renderSideSheet({ children: <span data-testid="custom-child">custom</span> });
    expect(screen.getByTestId("custom-child")).toBeInTheDocument();
  });

  it("does NOT render children slot when no children provided", () => {
    renderSideSheet();
    expect(screen.queryByTestId("side-sheet-children")).not.toBeInTheDocument();
  });

  it("Escape (native cancel event) fires onClose", () => {
    const onClose = vi.fn();
    renderSideSheet({ onClose });
    const dialog = screen.getByRole("dialog");
    // Same pattern as MobileSettingsSheet: native <dialog> dispatches
    // a real 'cancel' Event on Escape; fireEvent.cancel doesn't exist
    // so we dispatch the event directly.
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

  it("applies safe-area left padding via var(--safe-left) on the inner wrapper", () => {
    renderSideSheet();
    const inner = screen.getByTestId("side-sheet-inner");
    expect(inner.className).toMatch(/pl-\[var\(--safe-left\)\]/);
  });
});
