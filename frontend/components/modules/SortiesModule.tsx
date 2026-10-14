"use client";

import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { fmt } from "@/lib/helpers";
import type { Sortie } from "@/lib/types";

export interface SortiesModuleProps {
  onNew: () => void;
  onEdit: (sortie: Sortie) => void;
  onCancel: (id: number) => void;
}

export function SortiesModule({ onNew, onEdit, onCancel }: SortiesModuleProps) {
  const { t, stock, search, setSearchField, resetSearch, exportCSV, printModule, refresh, canWrite, canDelete } = useApp();
  const q = search.sorties.toLowerCase();

  const rows = stock.sorties.filter((e) => {
    if (search.sorDebut && e.date && e.date < search.sorDebut) return false;
    if (search.sorFin && e.date && e.date > search.sorFin) return false;
    if (q && ![e.reference, e.code, e.designation, e.atelier, e.motif].some((v) => String(v).toLowerCase().includes(q))) return false;
    return true;
  });

  const columns: Column<Sortie>[] = [
    { key: "reference", header: "N°", sortValue: (e) => e.reference, render: (e) => <strong>{e.reference}</strong> },
    { key: "date", header: "Date", sortValue: (e) => e.date, render: (e) => e.date },
    { key: "code", header: "Code", sortValue: (e) => e.code, render: (e) => e.code },
    { key: "designation", header: "Désignation", sortValue: (e) => e.designation, render: (e) => e.designation },
    { key: "qte", header: "Qté", sortValue: (e) => e.qte, render: (e) => e.qte },
    { key: "valeur", header: "Valeur", className: "total-cell", sortValue: (e) => Number(e.valeur), render: (e) => fmt(e.valeur) },
    { key: "atelier", header: "Atelier", sortValue: (e) => e.atelier, render: (e) => e.atelier },
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
    <section id="module-sorties" className="module active">
      <h2>{t("outputsTitle")}</h2>
      <Toolbar>
        {canWrite && <Button variant="success" onClick={onNew}>+ Sortie</Button>}
        <input placeholder={t("search")} value={search.sorties} onChange={(e) => setSearchField("sorties", e.target.value)} />
        <label>Du</label><input type="date" value={search.sorDebut} onChange={(e) => setSearchField("sorDebut", e.target.value)} />
        <label>Au</label><input type="date" value={search.sorFin} onChange={(e) => setSearchField("sorFin", e.target.value)} />
        <Button variant="secondary" onClick={() => resetSearch("sorties")}>✖</Button>
        <Button onClick={() => exportCSV("sorties")}>{t("exportCsv")}</Button>
        <Button variant="secondary" onClick={() => printModule("sorties", t("outputsTitle"))}>{t("print")}</Button>
        <Button variant="secondary" disabled={stock.refreshing} onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getKey={(e) => e.id} empty={t("noData")} loading={stock.loading} />
    </section>
  );
}
