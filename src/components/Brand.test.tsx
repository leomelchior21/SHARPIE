import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Brand, BrandHomeContext } from "./Brand";

describe("Brand", () => {
  afterEach(cleanup);

  it("leads to the homepage whenever a home action is provided", () => {
    const goHome = vi.fn();
    render(<BrandHomeContext.Provider value={goHome}><Brand compact /></BrandHomeContext.Provider>);
    fireEvent.click(screen.getByRole("button", { name: "Sharpie home" }));
    expect(goHome).toHaveBeenCalledTimes(1);
  });

  it("stays a plain logo before anyone signs in", () => {
    render(<Brand />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("SHARPIE")).toBeInTheDocument();
  });
});
