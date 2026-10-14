export type Role = "admin" | "magasinier" | "consultant";
export type Lang = "fr" | "ar";

export type ModuleKey =
  | "dashboard"
  | "articles"
  | "entrees"
  | "sorties"
  | "ajustements"
  | "stock"
  | "mouvements"
  | "alertes"
  | "inventaire"
  | "bons"
  | "sauvegarde"
  | "audit"
  | "utilisateurs";

/** DRF decimal fields are serialized as strings; dashboard figures are numbers. */
export type Money = string | number;

export interface PermissionInfo {
  label: string;
  perms: string[];
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  label?: string;
  theme?: "light" | "dark";
  lang?: Lang;
  last_login?: string | null;
}

export type Statut = "OK" | "Sous seuil" | "Rupture" | (string & {});

export interface Article {
  id: number;
  code: string;
  designation: string;
  categorie: string;
  unite: string;
  initial: number;
  seuil: number;
  prix: Money;
  emplacement: string;
  date_creation?: string;
  stock_dispo: number;
  total_entrees: number;
  total_sorties: number;
  total_ajust: number;
  statut: Statut;
}

export interface Entree {
  id: number;
  reference: string;
  date: string;
  code: string;
  designation: string;
  qte: number;
  prix_unit: Money;
  valeur: Money;
  fournisseur: string;
  facture: string;
  bl: string;
  statut: string;
}

export interface Sortie {
  id: number;
  reference: string;
  date: string;
  code: string;
  designation: string;
  qte: number;
  prix_unit: Money;
  valeur: Money;
  atelier: string;
  motif: string;
  statut: string;
}

export interface Ajustement {
  id: number;
  reference: string;
  date: string;
  code: string;
  designation: string;
  variation: number;
  prix_unit: Money;
  valeur: Money;
  motif: string;
  justificatif: string;
  statut: string;
}

export interface Mouvement {
  id: number;
  date: string;
  type: string;
  ref: string;
  code: string;
  designation: string;
  qte: number;
  prix_unit: Money;
  valeur: Money;
  tiers: string;
}

export interface InventaireLine {
  code: string;
  designation: string;
  theorique: number;
  physique: number;
  ecart: number;
  prixUnit: number;
  valeurEcart: number;
}

export interface Inventaire {
  id: number;
  reference: string;
  date: string;
  type: string;
  lines: InventaireLine[];
  ecart_total: number;
  val_ecart: Money;
  statut: string;
}

export interface AuditLog {
  id: number;
  date: string;
  action: string;
  details: string;
  user: string;
}

export interface DashboardBar {
  label: string;
  value: number;
  color: string;
}

export interface DashboardArticle {
  code: string;
  designation: string;
  categorie: string;
  stock: number;
  seuil: number;
  prix: Money;
  valeur: Money;
  statut: Statut;
}

export interface DashboardData {
  totalArticles?: number;
  sousSeuil?: number;
  ruptures?: number;
  valeurStock?: Money;
  mouvementsJour?: number;
  valeurMouvementsJour?: number;
  health?: number;
  lastOperation?: string;
  bars?: DashboardBar[];
  insight?: string;
  articles?: DashboardArticle[];
  max?: number;
  heroLastOp?: string;
}

export interface AlerteRow {
  code: string;
  designation: string;
  stock: number;
  seuil: number;
  prix: Money;
  manque: number;
  valeurManquante: Money;
  type: string;
}

export interface AlertesData {
  ruptures?: number;
  sousSeuil?: number;
  ok?: number;
  valeurReappro?: Money;
  rows: AlerteRow[];
}

export interface SearchState {
  articles: string;
  catArt: string;
  statutArt: string;
  entrees: string;
  entDebut: string;
  entFin: string;
  sorties: string;
  sorDebut: string;
  sorFin: string;
  ajustements: string;
  stock: string;
  stockCat: string;
  stockStatut: string;
  mouvements: string;
  mouvType: string;
  audit: string;
  inventaires: string;
  alertes: string;
  users: string;
}

export type SearchKey = keyof SearchState;

export interface NavItem {
  key: ModuleKey;
  labelKey: string;
}

export interface ArticleForm {
  editId: number | "";
  des: string;
  cat: string;
  uni: string;
  ini: number | string;
  seu: number | string;
  pri: number | string;
  emp: string;
}

export interface EntreeForm {
  editId: number | "";
  code: string;
  qte: number | string;
  pri: number | string;
  date: string;
  fou: string;
  fac: string;
  bl: string;
}

export interface SortieForm {
  editId: number | "";
  code: string;
  qte: number | string;
  date: string;
  ate: string;
  mot: string;
}

export interface AjustementForm {
  editId: number | "";
  code: string;
  var: number | string;
  date: string;
  mot: string;
  jus: string;
}

export interface UserForm {
  editId: number | "";
  login: string;
  name: string;
  pass: string;
  role: Role;
}

/** A bon (voucher) can be derived from an entree or a sortie. */
export type BonType = "entree" | "sortie";
export type BonOp = Entree | Sortie;
