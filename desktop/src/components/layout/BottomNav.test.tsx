import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { BottomNav, BOTTOM_NAV_ITEMS } from "./BottomNav";

function renderBottomNav(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe("BottomNav (PR1 — shell-redesign-v1)", () => {
  it("exports the four-item nav config with the locked routes", () => {
    expect(BOTTOM_NAV_ITEMS).toHaveLength(4);
    const paths = BOTTOM_NAV_ITEMS.map((i) => i.path);
    expect(paths).toEqual(["/", "/search", "/new", "/profile"]);
  });

  it("renders the four navigation items by label", () => {
    renderBottomNav();
    expect(screen.getByRole("link", { name: /notas/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /buscar/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /nueva/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /perfil/i })).toBeInTheDocument();
  });

  it("renders them in the locked order Notas → Buscar → Nueva → Perfil", () => {
    renderBottomNav();
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAccessibleName(/notas/i);
    expect(links[1]).toHaveAccessibleName(/buscar/i);
    expect(links[2]).toHaveAccessibleName(/nueva/i);
    expect(links[3]).toHaveAccessibleName(/perfil/i);
  });

  it("links to the four route paths declared in BOTTOM_NAV_ITEMS", () => {
    renderBottomNav();
    expect(screen.getByRole("link", { name: /notas/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /buscar/i })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("link", { name: /nueva/i })).toHaveAttribute("href", "/new");
    expect(screen.getByRole("link", { name: /perfil/i })).toHaveAttribute("href", "/profile");
  });

  it("Nueva item shows a FLAT solid '+' glyph (decision #2207) — no filled background", () => {
    renderBottomNav();
    const nuevaLink = screen.getByRole("link", { name: /nueva/i });
    // The icon container is wrapped in a span[data-testid=...] so the
    // test can interrogate the glyph without coupling to the surrounding
    // text node.
    const icon = nuevaLink.querySelector("[data-testid='bottom-nav-icon-nueva']");
    expect(icon).not.toBeNull();
    expect(icon!.textContent).toBe("+");
    // The wrapping link does NOT use a filled-accent background.
    expect(nuevaLink.className).not.toMatch(/\bbg-accent\b/);
  });

  it("marks the active route item with aria-current='page'", () => {
    renderBottomNav("/search");
    expect(screen.getByRole("link", { name: /buscar/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /notas/i })).not.toHaveAttribute("aria-current", "page");
  });

  it("does NOT mark any item active on a non-matching route (e.g., /notes/:id)", () => {
    renderBottomNav("/notes/abc");
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link).not.toHaveAttribute("aria-current", "page");
    }
  });

  it("every item has min-h-11 min-w-11 (44px touch target per spec)", () => {
    renderBottomNav();
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.className).toMatch(/\bmin-h-11\b/);
      expect(link.className).toMatch(/\bmin-w-11\b/);
    }
  });

  it("applies safe-area bottom padding via var(--safe-bottom)", () => {
    renderBottomNav();
    const nav = screen.getByRole("navigation");
    expect(nav.className).toMatch(/pb-\[var\(--safe-bottom\)\]/);
  });

  it("clicking Nueva navigates the host <MemoryRouter> to /new", async () => {
    const user = userEvent.setup();
    let lastPath = "/";
    function PathProbe() {
      const loc = useLocation();
      lastPath = loc.pathname;
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomNav />
        <PathProbe />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("link", { name: /nueva/i }));
    expect(lastPath).toBe("/new");
    cleanup();
  });

  it("renders stably at 360px viewport (visual regression snapshot)", () => {
    // The 360 width is the smallest target width for shell-redesign-v1
    // per T3.6 (mobile screenshots). The snapshot freezes the markup
    // contract; layout-level pixel diff happens at PR3 with screenshots.
    const { container } = renderBottomNav("/");
    expect(container.firstChild).toMatchSnapshot();
  });
});
