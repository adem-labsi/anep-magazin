"use client";

import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { fmt } from "@/lib/helpers";
import type { Entree } from "@/lib/types";

export interface EntreesModuleProps {
  onNew: () => void;
  onEdit: (entree: Entree) => void;
  onCancel: (id: number) => void;
}

export function EntreesModule({ onNew, onEdit, onCancel }: EntreesModuleProps) {
  const { t, stock, search, setSearchField, resetSearch, exportCSV, printModule, refresh, canWrite, canDelete } = useApp();
  const q = search.entrees.toLowerCase();

  const rows = stock.entrees.filter((e) => {
    if (search.entDebut && e.date && e.date < search.entDebut) return false;
    if (search.entFin && e.date && e.date > search.entFin) return false;
    if (q && ![e.reference, e.code, e.designation, e.fournisseur].some((v) => String(v).toLowerCase().includes(q))) return false;
    return true;
  });

  const columns: Column<Entree>[] = [
    { key: "reference", header: "N°", sortValue: (e) => e.reference, render: (e) => <strong>{e.reference}</strong> },
    { key: "date", header: "Date", sortValue: (e) => e.date, render: (e) => e.date },
    { key: "code", header: "Code", sortValue: (e) => e.code, render: (e) => e.code },
    { key: "designation", header: "Désignation", sortValue: (e) => e.designation, render: (e) => e.designation },
    { key: "qte", header: "Qté", sortValue: (e) => e.qte, render: (e) => e.qte },
    { key: "prix", header: "Prix", className: "prix-cell", sortValue: (e) => Number(e.prix_unit), render: (e) => fmt(e.prix_unit) },
    { key: "valeur", header: "Valeur", className: "total-cell", sortValue: (e) => Number(e.valeur), render: (e) => fmt(e.valeur) },
    { key: "fournisseur", header: "Fournisseur", sortValue: (e) => e.fournisseur, render: (e) => e.fournisseur },
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
    <section id="module-entrees" className="module active">
      <h2>{t("entriesTitle")}</h2>
      <Toolbar>
        {canWrite && <Button variant="success" onClick={onNew}>+ Réception</Button>}
        <input placeholder={t("search")} value={search.entrees} onChange={(e) => setSearchField("entrees", e.target.value)} />
        <label>Du</label><input type="date" value={search.entDebut} onChange={(e) => setSearchField("entDebut", e.target.value)} />
        <label>Au</label><input type="date" value={search.entFin} onChange={(e) => setSearchField("entFin", e.target.value)} />
        <Button variant="secondary" onClick={() => resetSearch("entrees")}>✖</Button>
        <Button onClick={() => exportCSV("entrees")}>{t("exportCsv")}</Button>
        <Button variant="secondary" onClick={() => printModule("entrees", t("entriesTitle"))}>{t("print")}</Button>
        <Button variant="secondary" disabled={stock.refreshing} onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getKey={(e) => e.id} empty={t("noData")} loading={stock.loading} />
    </section>
  );
}
