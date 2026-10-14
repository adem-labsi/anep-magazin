"use client";

import { useCallback, useMemo, useState } from "react";
import { ApiError, api } from "../api";
import { errorMessage } from "../helpers";
import type {
  Ajustement,
  AlertesData,
  Article,
  AuditLog,
  DashboardData,
  Entree,
  Inventaire,
  Mouvement,
  Sortie,
  User,
} from "../types";

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const results = (value as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
}

export type EndpointKey =
  | "articles"
  | "entrees"
  | "sorties"
  | "ajustements"
  | "mouvements"
  | "inventaires"
  | "audit"
  | "users"
  | "dashboard"
  | "alertes";

export const ALL_ENDPOINTS: EndpointKey[] = [
  "articles", "entrees", "sorties", "ajustements", "mouvements",
  "inventaires", "audit", "users", "dashboard", "alertes",
];

export interface StockData {
  articles: Article[];
  entrees: Entree[];
  sorties: Sortie[];
  ajustements: Ajustement[];
  mouvements: Mouvement[];
  inventaires: Inventaire[];
  audit: AuditLog[];
  users: User[];
  dashboard: DashboardData;
  alertes: AlertesData;
  loading: boolean;
  refreshing: boolean;
  load: () => Promise<void>;
  refresh: (keys?: EndpointKey[]) => Promise<void>;
}

export function useStockData(
  showToast: (msg: string) => void,
  onUnauthorized?: () => void,
): StockData {
  const [articles, setArticles] = useState<Article[]>([]);
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [sorties, setSorties] = useState<Sortie[]>([]);
  const [ajustements, setAjustements] = useState<Ajustement[]>([]);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [alertes, setAlertes] = useState<AlertesData>({ rows: [] });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        onUnauthorized?.();
        return;
      }
      showToast(errorMessage(e, "Erreur chargement"));
    },
    [onUnauthorized, showToast],
  );

  const loaders = useMemo<Record<EndpointKey, () => Promise<void>>>(() => ({
    articles: async () => setArticles(asArray<Article>(await api<unknown>("/articles/"))),
    entrees: async () => setEntrees(asArray<Entree>(await api<unknown>("/entrees/"))),
    sorties: async () => setSorties(asArray<Sortie>(await api<unknown>("/sorties/"))),
    ajustements: async () => setAjustements(asArray<Ajustement>(await api<unknown>("/ajustements/"))),
    mouvements: async () => setMouvements(asArray<Mouvement>(await api<unknown>("/mouvements/"))),
    inventaires: async () => setInventaires(asArray<Inventaire>(await api<unknown>("/inventaires/"))),
    audit: async () => setAudit(asArray<AuditLog>(await api<unknown>("/audit/"))),
    users: async () => setUsers(asArray<User>(await api<unknown>("/users/").catch(() => []))),
    dashboard: async () => setDashboard((await api<DashboardData>("/dashboard/")) || {}),
    alertes: async () => setAlertes((await api<AlertesData>("/alertes/")) || { rows: [] }),
  }), []);

  const refresh = useCallback(
    async (keys: EndpointKey[] = ALL_ENDPOINTS) => {
      setRefreshing(true);
      try {
        await Promise.all(keys.map((k) => loaders[k]()));
      } catch (e) {
        handleError(e);
      } finally {
        setRefreshing(false);
      }
    },
    [loaders, handleError],
  );

  const load = useCallback(async () => {
    setLoading(true);
    await refresh();
    setLoading(false);
  }, [refresh]);

  return useMemo(
    () => ({
      articles, entrees, sorties, ajustements, mouvements, inventaires, audit, users,
      dashboard, alertes, loading, refreshing, load, refresh,
    }),
    [
      articles, entrees, sorties, ajustements, mouvements, inventaires, audit, users,
      dashboard, alertes, loading, refreshing, load, refresh,
    ],
  );
}
