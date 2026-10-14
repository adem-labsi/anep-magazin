"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { fmt } from "@/lib/helpers";
import type { DashboardArticle } from "@/lib/types";

export function DashboardModule() {
  const { t, stock, exportCSV, printModule, refresh } = useApp();
  const dashboard = stock.dashboard;
  const showSkeleton = stock.loading && !dashboard.totalArticles;

  const columns: Column<DashboardArticle>[] = [
    { key: "code", header: "Code", sortValue: (a) => a.code, render: (a) => a.code },
    { key: "designation", header: "Désignation", sortValue: (a) => a.designation, render: (a) => a.designation },
    { key: "categorie", header: "Catégorie", sortValue: (a) => a.categorie, render: (a) => a.categorie },
    { key: "stock", header: "Stock Dispo", sortValue: (a) => a.stock, render: (a) => <strong>{a.stock}</strong> },
    { key: "seuil", header: "Seuil Min", sortValue: (a) => a.seuil, render: (a) => a.seuil },
    { key: "prix", header: "Prix Unit.", className: "prix-cell", sortValue: (a) => Number(a.prix), render: (a) => fmt(a.prix) },
    { key: "valeur", header: "Valeur", className: "total-cell", sortValue: (a) => Number(a.valeur), render: (a) => fmt(a.valeur) },
    { key: "statut", header: "Statut", sortValue: (a) => a.statut, render: (a) => <StatusBadge statut={a.statut} /> },
  ];

  return (
    <section id="module-dashboard" className="module active">
      <h2>{t("dashboardTitle")}</h2>
      <Toolbar>
        <Button onClick={() => exportCSV("articles")}>{t("exportCsv")}</Button>
        <Button variant="secondary" onClick={() => printModule("dashboard", t("dashboardTitle"))}>{t("print")}</Button>
        <Button variant="secondary" disabled={stock.refreshing} onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>

      <div className="dashboard-hero">
        <div>
          <div className="hero-eyebrow"><span className="pulse-dot" />Vue opérationnelle en direct</div>
          <h3>Le stock, en mouvement.</h3>
          <p>Synthèse temps réel.</p>
          <div className="hero-kpis">
            <div className="hero-kpi"><strong>{dashboard.health || 0}%</strong><span>Disponibilité</span></div>
            <div className="hero-kpi"><strong>{dashboard.heroLastOp || "-"}</strong><span>Dernière op.</span></div>
          </div>
        </div>
        <div className="scene-3d" aria-label="Animation 3D décorative">
          <div className="cube"><i /><i /><i /><i /><i /><i /></div>
        </div>
      </div>

      <div className="cards">
        {showSkeleton ? (
          <>{Array.from({ length: 5 }).map((_, i) => (
            <div className="card" key={i}><div className="skeleton skeleton-line" /></div>
          ))}</>
        ) : (
          <>
            <Card label="Total Articles" value={dashboard.totalArticles || 0} />
            <Card label="Sous Seuil" value={dashboard.sousSeuil || 0} variant="warn" />
            <Card label="Ruptures" value={dashboard.ruptures || 0} variant="danger" />
            <Card label="Valeur Stock" value={`${fmt(dashboard.valeurStock ?? 0)} DZD`} variant="success" />
            <Card label="Mouvements du jour" value={dashboard.mouvementsJour || 0} />
          </>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="insight-panel">
          <h3>Répartition du stock</h3>
          {(dashboard.bars || []).map((b) => (
            <div className="bar-row" key={b.label}>
              <span>{b.label}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.round((b.value / Math.max(1, dashboard.totalArticles || 1)) * 100)}%`, background: b.color }}
                />
              </div>
              <strong>{b.value}</strong>
            </div>
          ))}
        </div>
        <div className="insight-panel">
          <h3>Signal du jour</h3>
          <div>{dashboard.insight}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={dashboard.articles || []}
        getKey={(a) => a.code}
        empty={t("noData")}
        loading={stock.loading}
      />
    </section>
  );
}
