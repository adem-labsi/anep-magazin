"use client";

import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { fmt } from "@/lib/helpers";
import type { Ajustement } from "@/lib/types";

export interface AjustementsModuleProps {
  onNew: () => void;
  onEdit: (ajustement: Ajustement) => void;
  onCancel: (id: number) => void;
}

export function AjustementsModule({ onNew, onEdit, onCancel }: AjustementsModuleProps) {
  const { t, stock, search, setSearchField, resetSearch, exportCSV, printModule, refresh, canWrite, canDelete } = useApp();
  const q = search.ajustements.toLowerCase();

  const rows = stock.ajustements.filter((e) => {
    if (q && ![e.reference, e.code, e.designation, e.motif].some((v) => String(v).toLowerCase().includes(q))) return false;
    return true;
  });

  const columns: Column<Ajustement>[] = [
    { key: "reference", header: "Réf.", sortValue: (e) => e.reference, render: (e) => <strong>{e.reference}</strong> },
    { key: "date", header: "Date", sortValue: (e) => e.date, render: (e) => e.date },
    { key: "code", header: "Code", sortValue: (e) => e.code, render: (e) => e.code },
    { key: "designation", header: "Désignation", sortValue: (e) => e.designation, render: (e) => e.designation },
    {
      key: "variation",
      header: "Variation",
      sortValue: (e) => e.variation,
      render: (e) => (
        <span style={{ color: e.variation > 0 ? "#2e7d32" : "#c62828", fontWeight: 600 }}>
          {e.variation > 0 ? "+" : ""}{e.variation}
        </span>
      ),
    },
    { key: "valeur", header: "Valeur", className: "total-cell", sortValue: (e) => Number(e.valeur), render: (e) => fmt(e.valeur) },
    { key: "motif", header: "Motif", sortValue: (e) => e.motif, render: (e) => e.motif },
    { key: "statut", header: "Statut", sortValue: (e) => e.statut, render: (e) => <span className="badge info">{e.statut}</span> },
    {
      key: "actions",
      header: "Actions",
      className: "no-print",
      render: (e) => (
        <>
          {e.statut !== "Annulé" && canWrite && <Button variant="warn" small onClick={() => onEdit(e)}>✏️</Button>}
          {e.statut !== "Annulé" && canDelete && <Button variant="danger" small onClick={() => onCancel(e.id)}>❌</Button>}
        </>
      ),
    },
  ];

  return (
    <section id="module-ajustements" className="module active">
      <h2>{t("adjustmentsTitle")}</h2>
      <Toolbar>
        {canWrite && <Button variant="success" onClick={onNew}>+ Ajustement</Button>}
        <input placeholder={t("search")} value={search.ajustements} onChange={(e) => setSearchField("ajustements", e.target.value)} />
        <Button variant="secondary" onClick={() => resetSearch("ajustements")}>✖</Button>
        <Button onClick={() => exportCSV("ajustements")}>{t("exportCsv")}</Button>
        <Button variant="secondary" onClick={() => printModule("ajustements", t("adjustmentsTitle"))}>{t("print")}</Button>
        <Button variant="secondary" disabled={stock.refreshing} onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getKey={(e) => e.id} empty={t("noData")} loading={stock.loading} />
    </section>
  );
}
