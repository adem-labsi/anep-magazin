"use client";

import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { PERMISSIONS } from "@/lib/constants";
import type { User } from "@/lib/types";

export interface UsersModuleProps {
  onNew: () => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UsersModule({ onNew, onEdit, onDelete }: UsersModuleProps) {
  const { t, stock, search, setSearchField, exportCSV } = useApp();
  const q = search.users.toLowerCase();

  const rows = stock.users.filter((u) => {
    if (q && ![u.username, u.name, u.role].some((v) => String(v).toLowerCase().includes(q))) return false;
    return true;
  });

  const columns: Column<User>[] = [
    { key: "username", header: "Login", sortValue: (u) => u.username, render: (u) => <strong>{u.username}</strong> },
    { key: "name", header: "Nom", sortValue: (u) => u.name, render: (u) => u.name },
    {
      key: "role",
      header: "Rôle",
      sortValue: (u) => u.role,
      render: (u) => <span className="badge info">{(PERMISSIONS[u.role] || { label: u.role }).label}</span>,
    },
    {
      key: "perms",
      header: "Permissions",
      render: (u) => <span style={{ fontSize: 11 }}>{(PERMISSIONS[u.role]?.perms || []).join(", ")}</span>,
    },
    {
      key: "last_login",
      header: "Dernière connexion",
      sortValue: (u) => u.last_login || "",
      render: (u) => (u.last_login ? new Date(u.last_login).toLocaleString("fr-FR") : "Jamais"),
    },
    {
      key: "actions",
      header: "Actions",
      className: "no-print",
      render: (u) => (
        <>
          <Button variant="warn" small onClick={() => onEdit(u)}>✏️</Button>
          {u.username !== "admin" && <Button variant="danger" small onClick={() => onDelete(u)}>🗑️</Button>}
        </>
      ),
    },
  ];

  return (
    <section id="module-utilisateurs" className="module active">
      <h2>{t("usersTitle")}</h2>
      <Toolbar>
        <Button variant="success" onClick={onNew}>+ Utilisateur</Button>
        <input placeholder={t("search")} value={search.users} onChange={(e) => setSearchField("users", e.target.value)} />
        <Button onClick={() => exportCSV("utilisateurs")}>{t("exportCsv")}</Button>
      </Toolbar>
      <DataTable columns={columns} rows={rows} getKey={(u) => u.id} empty={t("noData")} loading={stock.loading} />
    </section>
  );
}
