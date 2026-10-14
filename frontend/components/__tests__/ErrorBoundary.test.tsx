import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

afterEach(() => vi.restoreAllMocks());

function Boom(): React.ReactElement {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <div>content ok</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("content ok")).toBeInTheDocument();
    err.mockRestore();
  });

  it("shows a fallback with the error message", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Erreur d’affichage")).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    err.mockRestore();
  });
});