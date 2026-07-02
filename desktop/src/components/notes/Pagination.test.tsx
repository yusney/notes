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
});