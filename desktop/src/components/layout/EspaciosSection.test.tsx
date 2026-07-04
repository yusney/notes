import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EspaciosSection } from "./EspaciosSection";
import { useNoteStore } from "../../stores/useNoteStore";
import type { Note, Tab } from "../../types";

// EspaciosSection reads `tabs`, `activeTabId`, `notes`, `setActiveTab`
// via destructuring. Mock the hook with a single object we seed
// per-test; expose the imperative action as a spy for assertions.
vi.mock("../../stores/useNoteStore", () => ({
  useNoteStore: vi.fn(),
}));

const mockSetActiveTab = vi.fn();

function seedStore(o: { tabs?: Tab[]; activeTabId?: string | null; notes?: Note[] } = {}) {
  vi.mocked(useNoteStore).mockReturnValue({
    tabs: o.tabs ?? [],
    activeTabId: o.activeTabId ?? null,
    notes: o.notes ?? [],
    setActiveTab: mockSetActiveTab,
  } as never);
}

const GENERAL: Tab = { id: "tab-1", name: "General" };
const PERSONAL: Tab = { id: "tab-2", name: "Personal" };
const TRABAJO: Tab = { id: "tab-3", name: "Trabajo" };

const note = (id: string, tabId: string): Note => ({
  id,
  tabId,
  title: id,
  content: "",
  tags: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: null,
});

beforeEach(() => {
  mockSetActiveTab.mockReset();
});

function renderSection(onClose = vi.fn()) {
  return render(<EspaciosSection onClose={onClose} />);
}

// ── T2 — Empty state ─────────────────────────────────────────────────────────

describe("EspaciosSection (T2 — empty state)", () => {
  it("renders empty-state copy + Espacios header when no tabs", () => {
    seedStore({ tabs: [], notes: [] });
    renderSection();
    expect(screen.getByText(/no hay espacios\. creá uno para agrupar tus notas\./i)).toBeInTheDocument();
    expect(screen.getByText(/^espacios$/i)).toBeInTheDocument();
  });
});

// ── T3 — Tab list with name + count ──────────────────────────────────────────

describe("EspaciosSection (T3 — tab list with name + count)", () => {
  it("renders each tab with name · count derived from notes", () => {
    seedStore({
      tabs: [GENERAL, PERSONAL, TRABAJO],
      notes: [note("a", "tab-1"), note("b", "tab-1"), note("c", "tab-1"), note("d", "tab-1"), note("e", "tab-1"), note("f", "tab-2")],
    });
    renderSection();
    // Layout: name and count are in sibling spans inside the row —
    // assert each piece via `within()` so the test stays stable
    // regardless of how the count is visually positioned.
    const generalRow = screen.getByTestId("espacios-tab-tab-1");
    const personalRow = screen.getByTestId("espacios-tab-tab-2");
    const trabajoRow = screen.getByTestId("espacios-tab-tab-3");
    expect(within(generalRow).getByText(/^general$/i)).toBeInTheDocument();
    expect(within(generalRow).getByText(/·\s*5/)).toBeInTheDocument();
    expect(within(personalRow).getByText(/^personal$/i)).toBeInTheDocument();
    expect(within(personalRow).getByText(/·\s*1/)).toBeInTheDocument();
    expect(within(trabajoRow).getByText(/^trabajo$/i)).toBeInTheDocument();
    expect(within(trabajoRow).getByText(/·\s*0/)).toBeInTheDocument();
  });

  it("counts only notes whose tabId matches (no cross-contamination)", () => {
    seedStore({
      tabs: [GENERAL, PERSONAL],
      notes: [note("a", "tab-1"), note("b", "tab-2"), note("c", "tab-2")],
    });
    renderSection();
    expect(within(screen.getByTestId("espacios-tab-tab-1")).getByText(/·\s*1/)).toBeInTheDocument();
    expect(within(screen.getByTestId("espacios-tab-tab-2")).getByText(/·\s*2/)).toBeInTheDocument();
  });
});

// ── T4 — Active tab highlight ────────────────────────────────────────────────

describe("EspaciosSection (T4 — active tab highlight)", () => {
  it("applies the active tokens to the active row only", () => {
    seedStore({
      tabs: [GENERAL, PERSONAL, TRABAJO],
      activeTabId: "tab-2",
      notes: [],
    });
    renderSection();

    const personal = screen.getByTestId("espacios-tab-tab-2");
    const general = screen.getByTestId("espacios-tab-tab-1");
    const trabajo = screen.getByTestId("espacios-tab-tab-3");

    // Active classes copied verbatim from Sidebar.tsx:117 (REQ-LAY-03 / Tailwind 4 namespace-safety).
    expect(personal.className).toMatch(/bg-accent-subtle/);
    expect(personal.className).toMatch(/border-l-2/);
    expect(personal.className).toMatch(/border-accent/);
    expect(personal).toHaveAttribute("aria-current", "true");

    expect(general.className).not.toMatch(/bg-accent-subtle/);
    expect(general).not.toHaveAttribute("aria-current", "true");
    expect(trabajo.className).not.toMatch(/bg-accent-subtle/);
    expect(trabajo).not.toHaveAttribute("aria-current", "true");
  });

  it("no row is highlighted when activeTabId is null", () => {
    seedStore({ tabs: [GENERAL, PERSONAL], activeTabId: null, notes: [] });
    renderSection();
    expect(screen.getByTestId("espacios-tab-tab-1")).not.toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("espacios-tab-tab-2")).not.toHaveAttribute("aria-current", "true");
  });
});

// ── T5 — Tap selects + closes drawer ─────────────────────────────────────────

describe("EspaciosSection (T5 — tap selects + closes drawer)", () => {
  it("clicking a non-active row calls setActiveTab(id) THEN onClose()", async () => {
    seedStore({ tabs: [GENERAL, PERSONAL], activeTabId: "tab-1", notes: [] });
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSection(onClose);

    await user.click(screen.getByTestId("espacios-tab-tab-2"));

    expect(mockSetActiveTab).toHaveBeenCalledTimes(1);
    expect(mockSetActiveTab).toHaveBeenCalledWith("tab-2");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the active row does NOT call setActiveTab (idempotent) but STILL calls onClose", async () => {
    seedStore({ tabs: [GENERAL, PERSONAL], activeTabId: "tab-2", notes: [] });
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSection(onClose);

    await user.click(screen.getByTestId("espacios-tab-tab-2"));

    // REQ-TAB-04: active-row tap is idempotent — store-level guard
    // (T1) + component-level guard, plus the drawer must still close.
    expect(mockSetActiveTab).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Row + section contract (REQ-TAB-02 + accessibility) ──────────────────────

describe("EspaciosSection — row contract", () => {
  it("each row has min-h-11 (44px touch target) + accessible testid", () => {
    seedStore({ tabs: [GENERAL], notes: [] });
    renderSection();
    const row = screen.getByTestId("espacios-tab-tab-1");
    // min-h-11 = 2.75rem = 44px in Tailwind 4 default spacing scale.
    expect(row.className).toMatch(/min-h-11/);
    // Accessibility: row is a real <button> with a meaningful label.
    expect(row.tagName).toBe("BUTTON");
  });
});