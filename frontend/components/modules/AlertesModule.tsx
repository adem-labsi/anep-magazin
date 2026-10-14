"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { fmt } from "@/lib/helpers";
import type { AlerteRow } from "@/lib/types";

export function AlertesModule() {
  const { t, stock, search, setSearchField, resetSearch, exportCSV, refresh } = useApp();
  const alertes = stock.alertes;
  const q = search.alertes.toLowerCase();

  const rows = (alertes.rows || []).filter((a) => {
    if (q && ![a.code, a.designation].some((v) => String(v).toLowerCase().includes(q))) return false;
    return true;
  });

  const columns: Column<AlerteRow>[] = [
    { key: "code", header: "Code", sortValue: (a) => a.code, render: (a) => a.code },
    { key: "designation", header: "Désignation", sortValue: (a) => a.designation, render: (a) => a.designation },
    { key: "stock", header: "Stock", sortValue: (a) => a.stock, render: (a) => a.stock },
    { key: "seuil", header: "Seuil", sortValue: (a) => a.seuil, render: (a) => a.seuil },
    { key: "prix", header: "Prix", className: "prix-cell", sortValue: (a) => Number(a.prix), render: (a) => fmt(a.prix) },
    { key: "valeurManquante", header: "Valeur manquante", className: "total-cell", sortValue: (a) => Number(a.valeurManquante), render: (a) => fmt(a.valeurManquante) },
    { key: "type", header: "Type", sortValue: (a) => a.type, render: (a) => <span className={`badge ${a.type === "RUPTURE" ? "danger" : "warn"}`}>{a.type}</span> },
  ];

  return (
    <section id="module-alertes" className="module active">
      <h2>{t("alertsTitle")}</h2>
      <Toolbar>
        <input placeholder={t("search")} value={search.alertes} onChange={(e) => setSearchField("alertes", e.target.value)} />
        <Button variant="secondary" onClick={() => resetSearch("alertes")}>✖</Button>
        <Button onClick={() => exportCSV("alertes")}>{t("exportCsv")}</Button>
        <Button variant="secondary" disabled={stock.refreshing} onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>
      <div className="cards">
        <Card label="Ruptures" value={alertes.ruptures || 0} variant="danger" />
        <Card label="Sous seuil" value={alertes.sousSeuil || 0} variant="warn" />
        <Card label="Articles OK" value={alertes.ok || 0} variant="success" />
        <Card label="Valeur réappro" value={`${fmt(alertes.valeurReappro ?? 0)} DZD`} />
      </div>
      <DataTable columns={columns} rows={rows} getKey={(a) => a.code} empty={t("noData")} loading={stock.loading} />
    </section>
  );
}
