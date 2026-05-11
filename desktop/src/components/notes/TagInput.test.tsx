import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagInput } from "./TagInput";
import type { Tag } from "../../types";

const mockTags: Tag[] = [
  { id: "t1", name: "react", userId: "u1", createdAt: "2024-01-01" },
  { id: "t2", name: "typescript", userId: "u1", createdAt: "2024-01-01" },
];

describe("TagInput", () => {
  it("renders input and existing tags", () => {
    render(
      <TagInput
        availableTags={mockTags}
        selectedTagNames={["react"]}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/etiqueta/i)).toBeInTheDocument();
  });

  it("calls onChange when typing and pressing Enter", () => {
    const onChange = vi.fn();
    render(
      <TagInput
        availableTags={mockTags}
        selectedTagNames={[]}
        onChange={onChange}
      />
    );

    const input = screen.getByPlaceholderText(/etiqueta/i);
    fireEvent.change(input, { target: { value: "work" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(["work"]);
  });

  it("removes tag when clicking its remove button", () => {
    const onChange = vi.fn();
    render(
      <TagInput
        availableTags={mockTags}
        selectedTagNames={["react", "typescript"]}
        onChange={onChange}
      />
    );

    const removeButtons = screen.getAllByRole("button", { name: /eliminar/i });
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(["typescript"]);
  });

  it("does not add duplicate tag names", () => {
    const onChange = vi.fn();
    render(
      <TagInput
        availableTags={mockTags}
        selectedTagNames={["react"]}
        onChange={onChange}
      />
    );

    const input = screen.getByPlaceholderText(/etiqueta/i);
    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
  });
});
