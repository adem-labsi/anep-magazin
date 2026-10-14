"use client";

import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { CATEGORIES } from "@/lib/constants";
import { fmt } from "@/lib/helpers";
import type { Article } from "@/lib/types";

export interface ArticlesModuleProps {
  onNew: () => void;
  onEdit: (article: Article) => void;
  onDelete: (article: Article) => void;
}

export function ArticlesModule({ onNew, onEdit, onDelete }: ArticlesModuleProps) {
  const { t, stock, search, setSearchField, resetSearch, exportCSV, printModule, refresh, canWrite, canDelete } = useApp();
  const q = search.articles.toLowerCase();

  const rows = stock.articles.filter((a) => {
    if (search.catArt && a.categorie !== search.catArt) return false;
    if (search.statutArt && a.statut !== search.statutArt) return false;
    if (q && ![a.code, a.designation, a.categorie, a.emplacement].some((v) => String(v).toLowerCase().includes(q))) return false;
    return true;
  });

  const columns: Column<Article>[] = [
    { key: "code", header: "Code", sortValue: (a) => a.code, render: (a) => <strong>{a.code}</strong> },
    { key: "designation", header: "Désignation", sortValue: (a) => a.designation, render: (a) => a.designation },
    { key: "categorie", header: "Catégorie", sortValue: (a) => a.categorie, render: (a) => a.categorie },
    { key: "unite", header: "Unité", sortValue: (a) => a.unite, render: (a) => a.unite },
    { key: "initial", header: "Stock Init.", sortValue: (a) => a.initial, render: (a) => a.initial },
    { key: "seuil", header: "Seuil", sortValue: (a) => a.seuil, render: (a) => a.seuil },
    { key: "emplacement", header: "Emplacement", sortValue: (a) => a.emplacement, render: (a) => a.emplacement },
    { key: "prix", header: "Prix", className: "prix-cell", sortValue: (a) => Number(a.prix), render: (a) => fmt(a.prix) },
    { key: "stock", header: "Stock Dispo", sortValue: (a) => a.stock_dispo, render: (a) => <strong>{a.stock_dispo}</strong> },
    { key: "statut", header: "Statut", sortValue: (a) => a.statut, render: (a) => <StatusBadge statut={a.statut} /> },
    {
      key: "actions",
      header: "Actions",
      className: "no-print",
      render: (a) => (
        <>
          {canWrite && <Button variant="warn" small onClick={() => onEdit(a)}>✏️</Button>}
          {canDelete && <Button variant="danger" small onClick={() => onDelete(a)}>🗑️</Button>}
        </>
      ),
    },
  ];

  return (
    <section id="module-articles" className="module active">
      <h2>{t("articlesTitle")}</h2>
      <Toolbar>
        {canWrite && <Button variant="success" onClick={onNew}>+ Nouvel Article</Button>}
        <input placeholder={t("search")} value={search.articles} onChange={(e) => setSearchField("articles", e.target.value)} />
        <select value={search.catArt} onChange={(e) => setSearchField("catArt", e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={search.statutArt} onChange={(e) => setSearchField("statutArt", e.target.value)}>
          <option value="">Tous statuts</option>
          <option>Rupture</option>
          <option>Sous seuil</option>
          <option>OK</option>
        </select>
        <Button variant="secondary" onClick={() => resetSearch("articles")}>✖</Button>
        <Button onClick={() => exportCSV("articles")}>{t("exportCsv")}</Button>
        <Button variant="secondary" onClick={() => printModule("articles", t("articlesTitle"))}>{t("print")}</Button>
        <Button variant="secondary" disabled={stock.refreshing} onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getKey={(a) => a.code} empty={t("noData")} loading={stock.loading} />
    </section>
  );
}
