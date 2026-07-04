import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("renders 'Mostrando X-Y de Z notas' info text", () => {
    render(
      <Pagination page={1} pageSize={10} totalCount={25} onPageChange={vi.fn()} />
    );

    expect(screen.getByText(/mostrando 1-10 de 25 notas/i)).toBeInTheDocument();
  });

  it("renders 'Página N de M' indicator", () => {
    render(
      <Pagination page={2} pageSize={10} totalCount={25} onPageChange={vi.fn()} />
    );

    expect(screen.getByText(/página 2 de 3/i)).toBeInTheDocument();
  });

  it("renders Anterior and Siguiente buttons", () => {
    render(
      <Pagination page={2} pageSize={10} totalCount={25} onPageChange={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeInTheDocument();
  });

  it("disables Anterior on page 1", () => {
    render(
      <Pagination page={1} pageSize={10} totalCount={25} onPageChange={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente/i })).not.toBeDisabled();
  });

  it("disables Siguiente on last page", () => {
    render(
      <Pagination page={3} pageSize={10} totalCount={25} onPageChange={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: /anterior/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
  });

  it("calls onPageChange with page-1 when Anterior clicked", () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} pageSize={10} totalCount={25} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: /anterior/i }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange with page+1 when Siguiente clicked", () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} pageSize={10} totalCount={25} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("does not render anything when totalCount is 0", () => {
    const { container } = render(
      <Pagination page={1} pageSize={10} totalCount={0} onPageChange={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders with both buttons disabled when there is only one page", () => {
    render(
      <Pagination page={1} pageSize={10} totalCount={5} onPageChange={vi.fn()} />
    );

    expect(screen.getByText(/mostrando 1-5 de 5 notas/i)).toBeInTheDocument();
    expect(screen.getByText(/página 1 de 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
  });

  it("computes end as totalCount when last page is not full", () => {
    render(
      <Pagination page={3} pageSize={10} totalCount={25} onPageChange={vi.fn()} />
    );

    expect(screen.getByText(/mostrando 21-25 de 25 notas/i)).toBeInTheDocument();
  });

  // ── mobileLayout opt-in (REQ-LAY-05) ──────────────────────────────────────
  //
  // On mobile (≤767px) the buttons stack vertically with full width to avoid
  // horizontal overflow at 360px-class viewports. At ≥768px the existing
  // horizontal layout is preserved byte-identically. The `mobileLayout` prop
  // is opt-in: undefined / false → byte-identical to baseline.

  it("default (mobileLayout=false) is byte-identical: container uses flex-row desktop layout", () => {
    const { container } = render(
      <Pagination page={2} pageSize={10} totalCount={25} onPageChange={vi.fn()} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/\bitems-center\b/);
    expect(root.className).toMatch(/\bjustify-between\b/);
    // No vertical stacking tokens.
    expect(root.className).not.toMatch(/\bflex-col\b/);
  });

  it("mobileLayout=true wraps container in flex-col with md:flex-row revert", () => {
    const { container } = render(
      <Pagination page={2} pageSize={10} totalCount={25} onPageChange={vi.fn()} mobileLayout />,
    );
    const root = container.firstChild as HTMLElement;
    // Mobile stacks vertically.
    expect(root.className).toMatch(/\bflex-col\b/);
    // Desktop ≥768px reverts to horizontal.
    expect(root.className).toMatch(/\bmd:flex-row\b/);
    // Items stretch full-width on mobile (overrides the desktop `items-center`).
    expect(root.className).toMatch(/\bitems-stretch\b/);
    expect(root.className).toMatch(/\bmd:items-center\b/);
  });

  it("mobileLayout=true makes Anterior/Siguiente buttons full-width on mobile", () => {
    render(
      <Pagination page={2} pageSize={10} totalCount={25} onPageChange={vi.fn()} mobileLayout />,
    );
    const anterior = screen.getByRole("button", { name: /anterior/i });
    const siguiente = screen.getByRole("button", { name: /siguiente/i });
    expect(anterior.className).toMatch(/\bw-full\b/);
    expect(anterior.className).toMatch(/\bmd:w-auto\b/);
    expect(siguiente.className).toMatch(/\bw-full\b/);
    expect(siguiente.className).toMatch(/\bmd:w-auto\b/);
  });

  it("default (mobileLayout=false) keeps Anterior/Siguiente button width auto only", () => {
    render(
      <Pagination page={2} pageSize={10} totalCount={25} onPageChange={vi.fn()} />,
    );
    const anterior = screen.getByRole("button", { name: /anterior/i });
    const siguiente = screen.getByRole("button", { name: /siguiente/i });
    expect(anterior.className).not.toMatch(/\bw-full\b/);
    expect(siguiente.className).not.toMatch(/\bw-full\b/);
  });
});