import { useMemo, useState, type Key, type ReactNode } from "react";
import { EmptyRow } from "./EmptyRow";

export interface Column<T> {
  key: string;
  header: ReactNode;
  className?: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T, index: number) => Key;
  empty?: string;
  loading?: boolean;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

function compare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function DataTable<T>({ columns, rows, getKey, empty, loading }: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const copy = rows.slice();
    copy.sort((a, b) => {
      const r = compare(col.sortValue!(a), col.sortValue!(b));
      return sort.dir === "asc" ? r : -r;
    });
    return copy;
  }, [rows, sort, columns]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  const showSkeleton = loading && rows.length === 0;

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={[c.className, c.sortValue ? "sortable" : ""].filter(Boolean).join(" ")}
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  onClick={c.sortValue ? () => toggleSort(c.key) : undefined}
                >
                  {c.header}
                  {c.sortValue && (
                    <span className="sort-ind no-print" aria-hidden="true">
                      {active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {showSkeleton &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="skeleton-row">
                {columns.map((c) => (
                  <td key={c.key} className={c.className}><span className="skeleton" /></td>
                ))}
              </tr>
            ))}
          {!showSkeleton && rows.length === 0 && empty && <EmptyRow colSpan={columns.length} label={empty} />}
          {!showSkeleton &&
            sorted.map((row, index) => (
              <tr key={getKey(row, index)}>
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
