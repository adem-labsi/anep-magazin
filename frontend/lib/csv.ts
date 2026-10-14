import { todayStr } from "./helpers";
import type {
  Ajustement,
  AlertesData,
  Article,
  AuditLog,
  Entree,
  Inventaire,
  Mouvement,
  Sortie,
  User,
} from "./types";

type Cell = string | number;
type Row = Cell[];

export function toCSV(rows: Row[]): string {
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
}

export function buildCSV(rows: Row[]): string {
  return "\uFEFF" + toCSV(rows);
}

export interface CsvContext {
  articles: Article[];
  entrees: Entree[];
  sorties: Sortie[];
  ajustements: Ajustement[];
  mouvements: Mouvement[];
  inventaires: Inventaire[];
  audit: AuditLog[];
  users: User[];
  alertes: AlertesData;
}

export interface CsvSpec {
  file: (date: string) => string;
  headers: Row;
  rows: (ctx: CsvContext) => Row[];
}

const frDate = (value: string) => new Date(value).toLocaleString("fr-FR");

export const CSV_EXPORTS: Record<string, CsvSpec> = {
  articles: {
    file: (d) => `ANEP_Articles_${d}.csv`,
    headers: ["Code", "Désignation", "Catégorie", "Unité", "Stock Init.", "Seuil", "Emplacement", "Prix Unitaire", "Stock Dispo", "Valeur"],
    rows: (c) =>
      c.articles.map((a) => [
        a.code, a.designation, a.categorie, a.unite, a.initial, a.seuil, a.emplacement,
        a.prix, a.stock_dispo, a.stock_dispo * (Number(a.prix) || 0),
      ]),
  },
  entrees: {
    file: (d) => `ANEP_Entrees_${d}.csv`,
    headers: ["N°", "Date", "Code", "Désignation", "Qté", "Prix Unit.", "Valeur", "Fournisseur", "BL", "Facture", "Statut"],
    rows: (c) =>
      c.entrees.map((e) => [e.reference, e.date, e.code, e.designation, e.qte, e.prix_unit, e.valeur, e.fournisseur, e.bl, e.facture, e.statut]),
  },
  sorties: {
    file: (d) => `ANEP_Sorties_${d}.csv`,
    headers: ["N°", "Date", "Code", "Désignation", "Qté", "Prix Unit.", "Valeur", "Atelier", "Motif", "Statut"],
    rows: (c) =>
      c.sorties.map((e) => [e.reference, e.date, e.code, e.designation, e.qte, e.prix_unit, e.valeur, e.atelier, e.motif, e.statut]),
  },
  ajustements: {
    file: (d) => `ANEP_Ajustements_${d}.csv`,
    headers: ["Réf.", "Date", "Code", "Désignation", "Variation", "Prix Unit.", "Valeur", "Motif", "Justificatif", "Statut"],
    rows: (c) =>
      c.ajustements.map((e) => [e.reference, e.date, e.code, e.designation, e.variation, e.prix_unit, e.valeur, e.motif, e.justificatif, e.statut]),
  },
  stock: {
    file: (d) => `ANEP_Stock_${d}.csv`,
    headers: ["Code", "Désignation", "Catégorie", "Unité", "Initial", "Entrées", "Sorties", "Ajust", "Stock Dispo", "Seuil", "Prix Unitaire", "Valeur Stock"],
    rows: (c) =>
      c.articles.map((a) => [
        a.code, a.designation, a.categorie, a.unite, a.initial, a.total_entrees, a.total_sorties,
        a.total_ajust, a.stock_dispo, a.seuil, a.prix, a.stock_dispo * (Number(a.prix) || 0),
      ]),
  },
  mouvements: {
    file: (d) => `ANEP_Mouvements_${d}.csv`,
    headers: ["Date", "Type", "Réf", "Code", "Désignation", "Qté", "Prix Unitaire", "Valeur", "Tiers"],
    rows: (c) =>
      c.mouvements.map((m) => [frDate(m.date), m.type, m.ref, m.code, m.designation, m.qte, m.prix_unit, m.valeur, m.tiers]),
  },
  inventaires: {
    file: (d) => `ANEP_Inventaires_${d}.csv`,
    headers: ["Réf.", "Date", "Type", "Articles", "Écart", "Valeur Écart", "Statut"],
    rows: (c) =>
      c.inventaires.map((i) => [i.reference, i.date, i.type, (i.lines || []).length, i.ecart_total, i.val_ecart, i.statut]),
  },
  audit: {
    file: (d) => `ANEP_Audit_${d}.csv`,
    headers: ["Date", "Action", "Détails", "Utilisateur"],
    rows: (c) => c.audit.map((a) => [frDate(a.date), a.action, a.details, a.user]),
  },
  utilisateurs: {
    file: (d) => `ANEP_Utilisateurs_${d}.csv`,
    headers: ["Login", "Nom", "Rôle", "Dernière connexion"],
    rows: (c) =>
      c.users.map((u) => [u.username, u.name, u.role, u.last_login ? frDate(u.last_login) : "Jamais"]),
  },
  alertes: {
    file: (d) => `ANEP_Alertes_${d}.csv`,
    headers: ["Code", "Désignation", "Stock", "Seuil", "Prix", "Valeur manquante", "Type"],
    rows: (c) =>
      (c.alertes.rows || []).map((a) => [a.code, a.designation, a.stock, a.seuil, a.prix, a.valeurManquante, a.type]),
  },
};

export interface CsvExport {
  filename: string;
  content: string;
}

export function buildExport(key: string, ctx: CsvContext): CsvExport | null {
  const spec = CSV_EXPORTS[key];
  if (!spec) return null;
  const rows = [spec.headers, ...spec.rows(ctx)];
  return { filename: spec.file(todayStr()), content: buildCSV(rows) };
}
