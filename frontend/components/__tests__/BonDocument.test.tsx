import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BonDocument } from "../bons/BonDocument";
import type { Article, Entree, Sortie } from "@/lib/types";

const art = { code: "ART-1", designation: "Boulon", unite: "Pièce", prix: "10.50" } as unknown as Article;

const entree = {
  id: 1, reference: "ENT-0001", date: "2026-01-01", code: "ART-1", designation: "Boulon",
  qte: 4, prix_unit: "10.50", valeur: "42.00", fournisseur: "Fourn SA", bl: "BL-1",
  facture: "FAC-1", statut: "Validé",
} as unknown as Entree;

describe("BonDocument", () => {
  it("builds a reception bon with totals and signatures", () => {
    render(<BonDocument type="entree" op={entree} art={art} />);
    expect(screen.getByText("BON DE RÉCEPTION")).toBeInTheDocument();
    expect(screen.getByText(/Fourn SA/)).toBeInTheDocument();
    expect(screen.getAllByText(/42,00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Le Réceptionnaire/)).toBeInTheDocument();
    expect(screen.getByAltText("ANEP")).toBeInTheDocument();
  });

  it("builds a sortie bon", () => {
    const sortie = { ...entree, atelier: "Atelier A", motif: "Maintenance" } as unknown as Sortie;
    render(<BonDocument type="sortie" op={sortie} art={art} />);
    expect(screen.getByText("BON DE SORTIE")).toBeInTheDocument();
    expect(screen.getByText(/Atelier A/)).toBeInTheDocument();
    expect(screen.getByText(/Le Bénéficiaire/)).toBeInTheDocument();
  });

  it("handles a missing operation", () => {
    render(<BonDocument type="entree" op={null} art={art} />);
    expect(screen.getByText("Sélectionnez un bon")).toBeInTheDocument();
  });

  it("falls back to the article price when prix_unit is absent", () => {
    const sortie = { ...entree, prix_unit: undefined, qte: 2 } as unknown as Sortie;
    render(<BonDocument type="sortie" op={sortie} art={art} />);
    expect(screen.getAllByText(/21,00/).length).toBeGreaterThan(0);
  });
});
