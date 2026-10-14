import { describe, it, expect } from "vitest";
import { buildCSV, buildExport, toCSV, type CsvContext } from "../csv";
import type { Article } from "../types";

const article: Article = {
  id: 1, code: "ART-1", designation: "Boulon", categorie: "Consommables", unite: "Pièce",
  initial: 10, seuil: 5, prix: "10.50", emplacement: "A1",
  stock_dispo: 8, total_entrees: 2, total_sorties: 4, total_ajust: 0, statut: "OK",
};

function ctx(overrides: Partial<CsvContext> = {}): CsvContext {
  return {
    articles: [], entrees: [], sorties: [], ajustements: [], mouvements: [],
    inventaires: [], audit: [], users: [], alertes: { rows: [] },
    ...overrides,
  };
}

describe("CSV helpers", () => {
  it("escapes quotes and joins with semicolons", () => {
    const csv = toCSV([["a;b", 'say "hi"', 42]]);
    expect(csv).toBe('"a;b";"say ""hi""";"42"');
  });

  it("prepends the BOM", () => {
    expect(buildCSV([["Code"]]).charCodeAt(0)).toBe(0xfeff);
  });
});

describe("buildExport", () => {
  it("returns null for an unknown key", () => {
    expect(buildExport("nope", ctx())).toBeNull();
  });

  it("builds the articles export with a dated filename", () => {
    const exp = buildExport("articles", ctx({ articles: [article] }));
    expect(exp).not.toBeNull();
    expect(exp!.filename).toMatch(/^ANEP_Articles_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(exp!.content).toContain("ART-1");
    expect(exp!.content).toContain("Valeur");
  });
});
