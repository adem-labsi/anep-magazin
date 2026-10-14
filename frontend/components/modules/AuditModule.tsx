"use client";

import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import type { AuditLog } from "@/lib/types";

export function AuditModule() {
  const { t, stock, search, setSearchField, resetSearch, exportCSV, refresh } = useApp();
  const q = search.audit.toLowerCase();

  const rows = stock.audit.filter((a) => {
    if (q && ![a.action, a.details, a.user].some((v) => String(v).toLowerCase().includes(q))) return false;
    return true;
  });

  const columns: Column<AuditLog>[] = [
    { key: "date", header: "Date", sortValue: (a) => a.date, render: (a) => new Date(a.date).toLocaleString("fr-FR") },
    { key: "action", header: "Action", sortValue: (a) => a.action, render: (a) => a.action },
    { key: "details", header: "Détails", sortValue: (a) => a.details, render: (a) => a.details },
    { key: "user", header: "Utilisateur", sortValue: (a) => a.user, render: (a) => a.user },
  ];

  return (
    <section id="module-audit" className="module active">
      <h2>{t("auditTitle")}</h2>
      <Toolbar>
        <input placeholder={t("search")} value={search.audit} onChange={(e) => setSearchField("audit", e.target.value)} />
        <Button variant="secondary" onClick={() => resetSearch("audit")}>✖</Button>
        <Button onClick={() => exportCSV("audit")}>{t("exportCsv")}</Button>
        <Button variant="secondary" disabled={stock.refreshing} onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getKey={(a) => a.id} empty={t("noData")} loading={stock.loading} />
    </section>
  );
}
