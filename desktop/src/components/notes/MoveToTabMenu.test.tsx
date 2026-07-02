/**
 * Tests for MoveToTabMenu — the accessible "Mover nota a..." dialog wired
 * into NoteRow. Closes issue #9's explicit a11y criterion that the
 * KeyboardSensor alone did not satisfy (per orchestrator review of #13).
 *
 * Spec coverage:
 *   - Renders title "Mover a..." and lists all tabs except the current one
 *   - Each tab option is a focusable <button>
 *   - Clicking a tab option calls onSelect(tabId) and onClose()
 *   - Keyboard nav: ArrowDown/Up moves focus between options,
 *     Home/End jumps to first/last, Enter selects
 *   - Escape closes (native <dialog> cancel)
 *   - Empty state when only one tab exists
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoveToTabMenu } from "./MoveToTabMenu";
import type { Tab } from "../../types";

const mockTabs: Tab[] = [
  { id: "t1", name: "Trabajo", createdAt: "2024-01-01" },
  { id: "t2", name: "Personal", createdAt: "2024-01-01" },
  { id: "t3", name: "Proyectos", createdAt: "2024-01-01" },
];

function renderMenu(props: Partial<Parameters<typeof MoveToTabMenu>[0]> = {}) {
  return render(
    <MoveToTabMenu
      open={props.open ?? true}
      onClose={props.onClose ?? vi.fn()}
      noteTitle={props.noteTitle ?? "My Note"}
      currentTabId={props.currentTabId ?? "t1"}
      tabs={props.tabs ?? mockTabs}
      onSelect={props.onSelect ?? vi.fn()}
    />
  );
}

describe("MoveToTabMenu", () => {
  it("renders the 'Mover a...' title", async () => {
    renderMenu();
    await act(async () => {});
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/mover a\.\.\./i)).toBeInTheDocument();
  });

  it("exposes a labelled dialog (aria-label 'Mover nota a...')", async () => {
    renderMenu();
    await act(async () => {});
    const dialog = screen.getByRole("dialog");
    // aria-labelledby from Modal's title h2, or aria-label set on the dialog.
    expect(
      dialog.getAttribute("aria-label") ?? dialog.getAttribute("aria-labelledby")
    ).toBeTruthy();
  });

  it("lists all tabs EXCEPT the note's current tab", async () => {
    renderMenu({ currentTabId: "t1" });
    await act(async () => {});

    const options = screen.getAllByRole("button", { name: /trabajo|personal|proyectos/i });
    // 3 total tabs minus the current (t1 = "Trabajo") → 2 options visible
    expect(options).toHaveLength(2);
    expect(screen.getByRole("button", { name: /personal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /proyectos/i })).toBeInTheDocument();
    // Current tab must NOT appear as an option
    expect(screen.queryByRole("button", { name: /^trabajo$/i })).not.toBeInTheDocument();
  });

  it("renders nothing when closed (open=false)", () => {
    renderMenu({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking a tab option calls onSelect with that tab id and then onClose", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderMenu({ onSelect, onClose, currentTabId: "t1" });
    await act(async () => {});

    await user.click(screen.getByRole("button", { name: /personal/i }));

    expect(onSelect).toHaveBeenCalledWith("t2");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed (native dialog cancel)", async () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    await act(async () => {});

    const dialog = screen.getByRole("dialog");
    await act(async () => {
      dialog.dispatchEvent(
        new Event("cancel", { bubbles: true, cancelable: true })
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows an empty-state message when no other tab exists", async () => {
    const singleTab: Tab[] = [{ id: "t1", name: "Trabajo", createdAt: "2024-01-01" }];
    renderMenu({ tabs: singleTab, currentTabId: "t1" });
    await act(async () => {});

    expect(screen.getByText(/no hay otros espacios/i)).toBeInTheDocument();
    // No tab buttons rendered in empty state
    expect(
      screen.queryByRole("button", { name: /trabajo|personal|proyectos/i })
    ).not.toBeInTheDocument();
  });

  // ── Keyboard navigation ────────────────────────────────────────────────

  it("ArrowDown moves focus to the next option", async () => {
    const user = userEvent.setup();
    renderMenu({ currentTabId: "t1" });
    await act(async () => {});

    const personalBtn = screen.getByRole("button", { name: /personal/i });
    const proyectosBtn = screen.getByRole("button", { name: /proyectos/i });
    personalBtn.focus();
    expect(personalBtn).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(proyectosBtn).toHaveFocus();
  });

  it("ArrowUp moves focus to the previous option", async () => {
    const user = userEvent.setup();
    renderMenu({ currentTabId: "t1" });
    await act(async () => {});

    const personalBtn = screen.getByRole("button", { name: /personal/i });
    const proyectosBtn = screen.getByRole("button", { name: /proyectos/i });
    proyectosBtn.focus();

    await user.keyboard("{ArrowUp}");
    expect(personalBtn).toHaveFocus();
  });

  it("ArrowDown wraps from last to first", async () => {
    const user = userEvent.setup();
    renderMenu({ currentTabId: "t1" });
    await act(async () => {});

    const personalBtn = screen.getByRole("button", { name: /personal/i });
    const proyectosBtn = screen.getByRole("button", { name: /proyectos/i });
    proyectosBtn.focus();

    await user.keyboard("{ArrowDown}");
    expect(personalBtn).toHaveFocus();
  });

  it("ArrowUp wraps from first to last", async () => {
    const user = userEvent.setup();
    renderMenu({ currentTabId: "t1" });
    await act(async () => {});

    const personalBtn = screen.getByRole("button", { name: /personal/i });
    const proyectosBtn = screen.getByRole("button", { name: /proyectos/i });
    personalBtn.focus();

    await user.keyboard("{ArrowUp}");
    expect(proyectosBtn).toHaveFocus();
  });

  it("Home jumps focus to the first option", async () => {
    const user = userEvent.setup();
    renderMenu({ currentTabId: "t1" });
    await act(async () => {});

    const personalBtn = screen.getByRole("button", { name: /personal/i });
    const proyectosBtn = screen.getByRole("button", { name: /proyectos/i });
    proyectosBtn.focus();

    await user.keyboard("{Home}");
    expect(personalBtn).toHaveFocus();
  });

  it("End jumps focus to the last option", async () => {
    const user = userEvent.setup();
    renderMenu({ currentTabId: "t1" });
    await act(async () => {});

    const personalBtn = screen.getByRole("button", { name: /personal/i });
    const proyectosBtn = screen.getByRole("button", { name: /proyectos/i });
    personalBtn.focus();

    await user.keyboard("{End}");
    expect(proyectosBtn).toHaveFocus();
  });

  it("Enter on a focused option calls onSelect with that tab id", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderMenu({ onSelect, currentTabId: "t1" });
    await act(async () => {});

    const proyectosBtn = screen.getByRole("button", { name: /proyectos/i });
    proyectosBtn.focus();

    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith("t3");
  });
});