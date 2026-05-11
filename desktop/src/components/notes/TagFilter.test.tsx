import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagFilter } from "./TagFilter";
import type { Tag } from "../../types";

const mockTags: Tag[] = [
  { id: "t1", name: "react", userId: "u1", createdAt: "2024-01-01" },
  { id: "t2", name: "typescript", userId: "u1", createdAt: "2024-01-01" },
  { id: "t3", name: "work", userId: "u1", createdAt: "2024-01-01" },
];

describe("TagFilter", () => {
  it("renders all available tags", () => {
    render(<TagFilter tags={mockTags} selectedTagIds={[]} onChange={vi.fn()} />);

    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("work")).toBeInTheDocument();
  });

  it("marks selected tags as active", () => {
    render(
      <TagFilter tags={mockTags} selectedTagIds={["t1"]} onChange={vi.fn()} />
    );

    const reactBtn = screen.getByRole("button", { name: /react/i });
    expect(reactBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange with added tagId when clicking inactive tag", () => {
    const onChange = vi.fn();
    render(
      <TagFilter tags={mockTags} selectedTagIds={[]} onChange={onChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: /react/i }));
    expect(onChange).toHaveBeenCalledWith(["t1"]);
  });

  it("calls onChange removing tagId when clicking active tag", () => {
    const onChange = vi.fn();
    render(
      <TagFilter tags={mockTags} selectedTagIds={["t1", "t2"]} onChange={onChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: /react/i }));
    expect(onChange).toHaveBeenCalledWith(["t2"]);
  });

  it("renders nothing when no tags available", () => {
    const { container } = render(
      <TagFilter tags={[]} selectedTagIds={[]} onChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
