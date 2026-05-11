import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import type { Tab } from "../../types";

const mockTabs: Tab[] = [
  { id: "t1", name: "Frontend", userId: "u1", createdAt: "", updatedAt: "" },
  { id: "t2", name: "Backend", userId: "u1", createdAt: "", updatedAt: "" },
  { id: "t3", name: "DevOps", userId: "u1", createdAt: "", updatedAt: "" },
];

function renderSidebar(props: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  return render(
    <MemoryRouter>
      <Sidebar
        tabs={mockTabs}
        activeTabId="t1"
        onTabSelect={vi.fn()}
        onCreateTab={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );
}

describe("Sidebar", () => {
  it("renders all tab names", () => {
    renderSidebar();

    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Backend")).toBeInTheDocument();
    expect(screen.getByText("DevOps")).toBeInTheDocument();
  });

  it("highlights the active tab with aria-current", () => {
    renderSidebar({ activeTabId: "t2" });

    const backendBtn = screen.getByRole("button", { name: "Backend" });
    expect(backendBtn).toHaveAttribute("aria-current", "true");

    const frontendBtn = screen.getByRole("button", { name: "Frontend" });
    expect(frontendBtn).not.toHaveAttribute("aria-current", "true");
  });

  it("calls onTabSelect with tab id when tab clicked", () => {
    const onTabSelect = vi.fn();
    renderSidebar({ onTabSelect });

    fireEvent.click(screen.getByRole("button", { name: "DevOps" }));

    expect(onTabSelect).toHaveBeenCalledWith("t3");
  });

  it("renders empty state message when no tabs", () => {
    renderSidebar({ tabs: [], activeTabId: null });

    expect(screen.getByText(/no hay tabs/i)).toBeInTheDocument();
  });

  it("renders a button to create a new tab", () => {
    renderSidebar();

    expect(screen.getByRole("button", { name: /nueva tab/i })).toBeInTheDocument();
  });

  it("calls onCreateTab when new tab button clicked", () => {
    const onCreateTab = vi.fn();
    renderSidebar({ onCreateTab });

    fireEvent.click(screen.getByRole("button", { name: /nueva tab/i }));

    expect(onCreateTab).toHaveBeenCalledTimes(1);
  });
});
