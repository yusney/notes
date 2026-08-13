import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SharedLinksList } from "./SharedLinksList";
import type { SharedLink } from "../../types";

const mockLinks: SharedLink[] = [
  {
    id: "link-1",
    token: "abc123defgh456ijklmn",
    noteId: "note-1",
    createdAt: "2026-05-08T00:00:00Z",
    expiresAt: null,
    isActive: true,
  },
  {
    id: "link-2",
    token: "xyz789uvwab012cdefgh",
    noteId: "note-1",
    createdAt: "2026-05-08T01:00:00Z",
    expiresAt: "2026-06-08T00:00:00Z",
    isActive: true,
  },
];

describe("SharedLinksList", () => {
  it("renders all active shared links", () => {
    render(
      <SharedLinksList links={mockLinks} onRevoke={vi.fn()} />
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows token for each link", () => {
    render(
      <SharedLinksList links={mockLinks} onRevoke={vi.fn()} />
    );

    expect(screen.getByText("abc123defgh456ijklmn")).toBeInTheDocument();
  });

  it("calls onRevoke with token when revoke button is clicked", () => {
    const onRevoke = vi.fn();
    render(
      <SharedLinksList links={mockLinks} onRevoke={onRevoke} />
    );

    const revokeButtons = screen.getAllByRole("button", { name: /revocar/i });
    fireEvent.click(revokeButtons[0]);

    expect(onRevoke).toHaveBeenCalledWith("abc123defgh456ijklmn");
  });

  it("shows empty state when no links", () => {
    render(
      <SharedLinksList links={[]} onRevoke={vi.fn()} />
    );

    expect(screen.getByText(/no hay enlaces compartidos/i)).toBeInTheDocument();
  });
});
