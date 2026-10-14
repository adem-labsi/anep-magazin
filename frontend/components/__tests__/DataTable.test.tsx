import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable, type Column } from "../ui/DataTable";

interface Row {
  code: string;
  qte: number;
}

const rows: Row[] = [
  { code: "B", qte: 3 },
  { code: "A", qte: 1 },
  { code: "C", qte: 2 },
];

const columns: Column<Row>[] = [
  { key: "code", header: "Code", sortValue: (r) => r.code, render: (r) => r.code },
  { key: "qte", header: "Qté", sortValue: (r) => r.qte, render: (r) => r.qte },
  { key: "actions", header: "Actions", render: () => "—" },
];

function firstColumn(): string[] {
  const bodyRows = screen.getAllByRole("row").slice(1);
  return bodyRows.map((r) => r.querySelector("td")!.textContent || "");
}

describe("DataTable", () => {
  it("cycles a sortable column asc, desc, then original order", () => {
    render(<DataTable columns={columns} rows={rows} getKey={(r) => r.code} />);

    expect(firstColumn()).toEqual(["B", "A", "C"]);

    fireEvent.click(screen.getByText("Code"));
    expect(firstColumn()).toEqual(["A", "B", "C"]);

    fireEvent.click(screen.getByText("Code"));
    expect(firstColumn()).toEqual(["C", "B", "A"]);

    fireEvent.click(screen.getByText("Code"));
    expect(firstColumn()).toEqual(["B", "A", "C"]);
  });

  it("sorts numerically for numeric accessors", () => {
    render(<DataTable columns={columns} rows={rows} getKey={(r) => r.code} />);

    fireEvent.click(screen.getByText("Qté"));
    expect(firstColumn()).toEqual(["A", "C", "B"]);
  });

  it("only marks sortable headers as sortable", () => {
    render(<DataTable columns={columns} rows={rows} getKey={(r) => r.code} />);
    expect(screen.getByText("Code").closest("th")).toHaveClass("sortable");
    expect(screen.getByText("Actions").closest("th")).not.toHaveClass("sortable");
  });

  it("renders skeleton rows while loading with no data", () => {
    const { container } = render(
      <DataTable columns={columns} rows={[]} getKey={(r) => r.code} loading />,
    );
    expect(container.querySelectorAll(".skeleton-row").length).toBeGreaterThan(0);
  });
});
