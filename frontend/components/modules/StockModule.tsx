"use client";

import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { CATEGORIES } from "@/lib/constants";
import { fmt } from "@/lib/helpers";
import type { Article } from "@/lib/types";

export function StockModule() {
  const { t, stock, search, setSearchField, resetSearch, exportCSV, printModule, refresh } = useApp();
  const q = search.stock.toLowerCase();

  const rows = stock.articles.filter((a) => {
    if (search.stockCat && a.categorie !== search.stockCat) return false;
    if (search.stockStatut && a.statut !== search.stockStatut) return false;
    if (q && ![a.code, a.designation, a.categorie].some((v) => String(v).toLowerCase().includes(q))) return false;
    return true;
  });

  const columns: Column<Article>[] = [
    { key: "code", header: "Code", sortValue: (a) => a.code, render: (a) => <strong>{a.code}</strong> },
    { key: "designation", header: "Désignation", sortValue: (a) => a.designation, render: (a) => a.designation },
    { key: "unite", header: "Unité", sortValue: (a) => a.unite, render: (a) => a.unite },
    { key: "initial", header: "Initial", sortValue: (a) => a.initial, render: (a) => a.initial },
    { key: "entrees", header: "Entrées", sortValue: (a) => a.total_entrees, render: (a) => <span style={{ color: "#2e7d32" }}>+{a.total_entrees}</span> },
    { key: "sorties", header: "Sorties", sortValue: (a) => a.total_sorties, render: (a) => <span style={{ color: "#c62828" }}>-{a.total_sorties}</span> },
    { key: "ajust", header: "Ajust.", sortValue: (a) => a.total_ajust, render: (a) => a.total_ajust },
    { key: "stock", header: "Stock Dispo", sortValue: (a) => a.stock_dispo, render: (a) => <strong>{a.stock_dispo}</strong> },
    { key: "seuil", header: "Seuil", sortValue: (a) => a.seuil, render: (a) => a.seuil },
    { key: "prix", header: "Prix", className: "prix-cell", sortValue: (a) => Number(a.prix), render: (a) => fmt(a.prix) },
    { key: "valeur", header: "Valeur Stock", className: "total-cell", sortValue: (a) => a.stock_dispo * (Number(a.prix) || 0), render: (a) => fmt(a.stock_dispo * (Number(a.prix) || 0)) },
    { key: "statut", header: "Statut", sortValue: (a) => a.statut, render: (a) => <StatusBadge statut={a.statut} /> },
  ];

  return (
    <section id="module-stock" className="module active">
      <h2>{t("stockTitle")}</h2>
      <Toolbar>
        <input placeholder={t("search")} value={search.stock} onChange={(e) => setSearchField("stock", e.target.value)} />
        <select value={search.stockCat} onChange={(e) => setSearchField("stockCat", e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={search.stockStatut} onChange={(e) => setSearchField("stockStatut", e.target.value)}>
          <option value="">Tous statuts</option>
          <option>Rupture</option><option>Sous seuil</option><option>OK</option>
        </select>
        <Button variant="secondary" onClick={() => resetSearch("stock")}>✖</Button>
        <Button onClick={() => exportCSV("stock")}>{t("exportCsv")}</Button>
        <Button variant="secondary" onClick={() => printModule("stock", t("stockTitle"))}>{t("print")}</Button>
        <Button variant="secondary" disabled={stock.refreshing} onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getKey={(a) => a.code} empty={t("noData")} loading={stock.loading} />
    </section>
  );
}
