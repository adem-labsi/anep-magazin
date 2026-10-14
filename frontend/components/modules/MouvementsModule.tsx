"use client";

import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { fmt } from "@/lib/helpers";
import type { Mouvement } from "@/lib/types";

export function MouvementsModule() {
  const { t, stock, search, setSearchField, resetSearch, exportCSV, refresh } = useApp();
  const q = search.mouvements.toLowerCase();

  const rows = stock.mouvements.filter((m) => {
    if (search.mouvType && m.type !== search.mouvType) return false;
    if (q && ![m.ref, m.code, m.designation, m.tiers].some((v) => String(v).toLowerCase().includes(q))) return false;
    return true;
  });

  const badgeClass = (type: string) => (type === "Entrée" ? "ok" : type === "Sortie" ? "danger" : "info");

  const columns: Column<Mouvement>[] = [
    { key: "date", header: "Date", sortValue: (m) => m.date, render: (m) => new Date(m.date).toLocaleString("fr-FR") },
    { key: "type", header: "Type", sortValue: (m) => m.type, render: (m) => <span className={`badge ${badgeClass(m.type)}`}>{m.type}</span> },
    { key: "ref", header: "Réf.", sortValue: (m) => m.ref, render: (m) => m.ref },
    { key: "code", header: "Code", sortValue: (m) => m.code, render: (m) => m.code },
    { key: "designation", header: "Désignation", sortValue: (m) => m.designation, render: (m) => m.designation },
    {
      key: "qte",
      header: "Qté",
      sortValue: (m) => m.qte,
      render: (m) => <span style={{ fontWeight: 600, color: m.qte > 0 ? "#2e7d32" : "#c62828" }}>{m.qte > 0 ? "+" : ""}{m.qte}</span>,
    },
    { key: "prix", header: "Prix", className: "prix-cell", sortValue: (m) => Number(m.prix_unit), render: (m) => fmt(m.prix_unit) },
    { key: "valeur", header: "Valeur", className: "total-cell", sortValue: (m) => Number(m.valeur), render: (m) => fmt(m.valeur) },
    { key: "tiers", header: "Tiers", sortValue: (m) => m.tiers, render: (m) => m.tiers },
  ];

  return (
    <section id="module-mouvements" className="module active">
      <h2>{t("movementsTitle")}</h2>
      <Toolbar>
        <input placeholder={t("search")} value={search.mouvements} onChange={(e) => setSearchField("mouvements", e.target.value)} />
        <select value={search.mouvType} onChange={(e) => setSearchField("mouvType", e.target.value)}>
          <option value="">Tous types</option>
          <option>Entrée</option><option>Sortie</option><option>Ajustement</option><option>Annulation</option><option>Initial</option>
        </select>
        <Button variant="secondary" onClick={() => resetSearch("mouvements")}>✖</Button>
        <Button onClick={() => exportCSV("mouvements")}>{t("exportCsv")}</Button>
        <Button variant="secondary" disabled={stock.refreshing} onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getKey={(m) => m.id} empty={t("noData")} loading={stock.loading} />
    </section>
  );
}
