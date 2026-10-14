import type { NavItem, PermissionInfo, Role, SearchState } from "./types";

export const NAV: NavItem[] = [
  { key: "dashboard", labelKey: "navDashboard" },
  { key: "articles", labelKey: "navArticles" },
  { key: "entrees", labelKey: "navEntries" },
  { key: "sorties", labelKey: "navOutputs" },
  { key: "ajustements", labelKey: "navAdjustments" },
  { key: "stock", labelKey: "navStock" },
  { key: "mouvements", labelKey: "navMovements" },
  { key: "alertes", labelKey: "navAlerts" },
  { key: "inventaire", labelKey: "navInventory" },
  { key: "bons", labelKey: "navVouchers" },
  { key: "sauvegarde", labelKey: "navBackup" },
  { key: "audit", labelKey: "navAudit" },
  { key: "utilisateurs", labelKey: "navUsers" },
];

export const CATEGORIES = [
  "Consommables",
  "Signalétique",
  "Outillage",
  "Équipement",
  "Fournitures Bureau",
  "Peinture",
  "Électrique",
  "Autre",
];

export const UNITES = ["Unité", "Pièce", "Kit", "Kg", "Litre", "Mètre"];

export const ROLES: Role[] = ["admin", "magasinier", "consultant"];

export const PERMISSIONS: Record<string, PermissionInfo> = {
  admin: {
    label: "👑 Administrateur",
    perms: ["Créer", "Lire", "Modifier", "Supprimer", "Imprimer", "Exporter", "Gérer utilisateurs"],
  },
  magasinier: {
    label: "📦 Magasinier",
    perms: ["Créer", "Lire", "Modifier", "Imprimer", "Exporter"],
  },
  consultant: {
    label: "🔍 Consultant",
    perms: ["Lire", "Imprimer", "Exporter"],
  },
};

export const STORAGE_KEYS = {
  token: "anep_token",
  user: "anep_user",
  theme: "ANEP_THEME",
  lang: "ANEP_LANG",
} as const;

export const EMPTY_SEARCH: SearchState = {
  articles: "",
  catArt: "",
  statutArt: "",
  entrees: "",
  entDebut: "",
  entFin: "",
  sorties: "",
  sorDebut: "",
  sorFin: "",
  ajustements: "",
  stock: "",
  stockCat: "",
  stockStatut: "",
  mouvements: "",
  mouvType: "",
  audit: "",
  inventaires: "",
  alertes: "",
  users: "",
};

/** Search fields that belong to each module (used to reset filters). */
export const SEARCH_FIELDS: Record<string, (keyof SearchState)[]> = {
  articles: ["articles", "catArt", "statutArt"],
  entrees: ["entrees", "entDebut", "entFin"],
  sorties: ["sorties", "sorDebut", "sorFin"],
  ajustements: ["ajustements"],
  stock: ["stock", "stockCat", "stockStatut"],
  mouvements: ["mouvements", "mouvType"],
  audit: ["audit"],
  inventaires: ["inventaires"],
  alertes: ["alertes"],
  utilisateurs: ["users"],
};
