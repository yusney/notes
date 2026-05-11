import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchBar } from "./SearchBar";

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a search input with placeholder", () => {
    render(<SearchBar onSearch={vi.fn()} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
  });

  it("calls onSearch after 300ms debounce when user types", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "react" } });

    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("react");
  });

  it("does NOT call onSearch before 300ms", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "ty" } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("debounces: only calls once when typing fast", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "r" } });
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.change(input, { target: { value: "re" } });
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.change(input, { target: { value: "react" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("react");
  });

  it("shows clear button when input has text", () => {
    render(<SearchBar onSearch={vi.fn()} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "hello" } });

    expect(screen.getByRole("button", { name: /limpiar/i })).toBeInTheDocument();
  });

  it("clears input and calls onSearch('') when clear button clicked", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "hello" } });
    act(() => { vi.advanceTimersByTime(300); });
    onSearch.mockClear();

    const clearBtn = screen.getByRole("button", { name: /limpiar/i });
    fireEvent.click(clearBtn);

    expect((input as HTMLInputElement).value).toBe("");
    expect(onSearch).toHaveBeenCalledWith("");
  });
});
