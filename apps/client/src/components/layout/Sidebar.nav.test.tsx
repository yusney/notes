import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";

function renderSidebar(props = {}) {
  return render(
    <MemoryRouter>
      <Sidebar
        tabs={[]}
        activeTabId={null}
        onTabSelect={vi.fn()}
        onCreateTab={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );
}

describe("Sidebar - navigation links", () => {
  it("renders a link to the profile page", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /perfil/i })).toHaveAttribute("href", "/profile");
  });

  it("renders a link to the settings page", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /configuración/i })).toHaveAttribute("href", "/settings");
  });
});
