import { describe, it, expect } from "vitest";
import { errorMessage, fmt, statutClass, todayStr } from "../helpers";

describe("format helpers", () => {
  it("formats numbers with two decimals", () => {
    expect(fmt(5)).toBe("5,00");
    expect(fmt("12.5")).toBe("12,50");
    expect(fmt(null as unknown as number)).toBe("0,00");
  });

  it("returns today's date as YYYY-MM-DD", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("maps statut to a css class", () => {
    expect(statutClass("Rupture")).toBe("danger");
    expect(statutClass("Sous seuil")).toBe("warn");
    expect(statutClass("OK")).toBe("ok");
  });
});

describe("errorMessage", () => {
  it("uses the Error message when available", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("accepts a plain string", () => {
    expect(errorMessage("oops")).toBe("oops");
  });

  it("falls back for unknown values", () => {
    expect(errorMessage(null, "Erreur chargement")).toBe("Erreur chargement");
    expect(errorMessage(undefined)).toBe("Erreur");
  });
});
