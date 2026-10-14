import type { Money, Statut } from "./types";

export function fmt(n: Money): string {
  return (Number(n) || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function errorMessage(e: unknown, fallback = "Erreur"): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return fallback;
}

export function statutClass(statut: Statut): string {
  if (statut === "Rupture") return "danger";
  if (statut === "Sous seuil") return "warn";
  return "ok";
}

export function downloadFile(filename: string, content: string, mime = "text/plain"): boolean {
  if (typeof document === "undefined") return false;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
