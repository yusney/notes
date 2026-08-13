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
  it("renders the Filtrar button (no inline tag list)", () => {
    render(<TagFilter tags={mockTags} selectedTagIds={[]} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /filtrar/i })).toBeInTheDocument();
    // Tags are NOT shown inline — they live inside the modal
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("renders nothing when no tags are available", () => {
    const { container } = render(
      <TagFilter tags={[]} selectedTagIds={[]} onChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders selected tags as removable chips", () => {
    render(
      <TagFilter tags={mockTags} selectedTagIds={["t1", "t2"]} onChange={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: /quitar react/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quitar typescript/i })).toBeInTheDocument();
    // Filtrar button reflects the count
    expect(screen.getByRole("button", { name: /filtrar \(2\)/i })).toBeInTheDocument();
  });

  it("calls onChange removing a tag when its chip is clicked", () => {
    const onChange = vi.fn();
    render(
      <TagFilter tags={mockTags} selectedTagIds={["t1", "t2"]} onChange={onChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: /quitar react/i }));
    expect(onChange).toHaveBeenCalledWith(["t2"]);
  });

  it("calls onChange([]) when Limpiar is clicked on the chips row", () => {
    const onChange = vi.fn();
    render(
      <TagFilter tags={mockTags} selectedTagIds={["t1"]} onChange={onChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: /^limpiar$/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("opens a modal with a searchable checkbox list when Filtrar is clicked", () => {
    render(<TagFilter tags={mockTags} selectedTagIds={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /filtrar/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /buscar etiqueta/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /react/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /typescript/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /work/i })).toBeInTheDocument();
  });

  it("toggles a tag via its checkbox inside the modal", () => {
    const onChange = vi.fn();
    render(<TagFilter tags={mockTags} selectedTagIds={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /filtrar/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /react/i }));

    expect(onChange).toHaveBeenCalledWith(["t1"]);
  });

  it("filters the tag list by the search query", () => {
    render(<TagFilter tags={mockTags} selectedTagIds={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /filtrar/i }));
    fireEvent.change(screen.getByRole("searchbox", { name: /buscar etiqueta/i }), {
      target: { value: "type" },
    });

    expect(screen.getByRole("checkbox", { name: /typescript/i })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /react/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /work/i })).not.toBeInTheDocument();
  });

  it("shows a no-matches message when search yields nothing", () => {
    render(<TagFilter tags={mockTags} selectedTagIds={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /filtrar/i }));
    fireEvent.change(screen.getByRole("searchbox", { name: /buscar etiqueta/i }), {
      target: { value: "zzz" },
    });

    expect(screen.getByText(/sin coincidencias/i)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("closes the modal when Cerrar is clicked", () => {
    render(<TagFilter tags={mockTags} selectedTagIds={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /filtrar/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables Limpiar inside the modal when nothing is selected", () => {
    render(<TagFilter tags={mockTags} selectedTagIds={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /filtrar/i }));
    // The in-modal Limpiar is disabled; the chips-row Limpiar is not rendered
    // (no selection), so the only Limpiar present is the disabled one.
    expect(screen.getByRole("button", { name: /limpiar/i })).toBeDisabled();
  });
});
