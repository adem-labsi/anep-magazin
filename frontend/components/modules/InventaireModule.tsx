"use client";

import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { fmt } from "@/lib/helpers";
import type { Inventaire } from "@/lib/types";

export interface InventaireModuleProps {
  onNew: () => void;
}

export function InventaireModule({ onNew }: InventaireModuleProps) {
  const { t, stock, search, setSearchField, resetSearch, exportCSV, refresh, canWrite } = useApp();
  const q = search.inventaires.toLowerCase();

  const rows = stock.inventaires.filter((i) => {
    if (q && ![i.reference, i.type, i.statut].some((v) => String(v).toLowerCase().includes(q))) return false;
    return true;
  });

  const columns: Column<Inventaire>[] = [
    { key: "reference", header: "Réf.", sortValue: (i) => i.reference, render: (i) => <strong>{i.reference}</strong> },
    { key: "date", header: "Date", sortValue: (i) => i.date, render: (i) => i.date },
    { key: "type", header: "Type", sortValue: (i) => i.type, render: (i) => i.type },
    { key: "articles", header: "Articles", sortValue: (i) => (i.lines || []).length, render: (i) => (i.lines || []).length },
    {
      key: "ecart",
      header: "Écart",
      sortValue: (i) => i.ecart_total,
      render: (i) => <span style={{ color: i.ecart_total < 0 ? "#c62828" : "#2e7d32", fontWeight: 600 }}>{i.ecart_total}</span>,
    },
    { key: "valEcart", header: "Valeur Écart", sortValue: (i) => Number(i.val_ecart), render: (i) => fmt(i.val_ecart) },
    { key: "statut", header: "Statut", sortValue: (i) => i.statut, render: (i) => <span className="badge info">{i.statut}</span> },
  ];

  return (
    <section id="module-inventaire" className="module active">
      <h2>{t("inventoryTitle")}</h2>
      <Toolbar>
        {canWrite && <Button variant="success" onClick={onNew}>+ Inventaire</Button>}
        <input placeholder={t("search")} value={search.inventaires} onChange={(e) => setSearchField("inventaires", e.target.value)} />
        <Button variant="secondary" onClick={() => resetSearch("inventaires")}>✖</Button>
        <Button onClick={() => exportCSV("inventaires")}>{t("exportCsv")}</Button>
        <Button variant="secondary" disabled={stock.refreshing} onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getKey={(i) => i.id} empty={t("noData")} loading={stock.loading} />
    </section>
  );
}
