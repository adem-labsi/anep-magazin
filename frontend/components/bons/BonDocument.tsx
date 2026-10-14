import { fmt } from "@/lib/helpers";
import { ANEP_LOGO_DATA_URL } from "@/lib/logo";
import type { Article, BonOp, BonType, Entree, Sortie } from "@/lib/types";

export interface BonDocumentProps {
  type: BonType;
  op: BonOp | null;
  art?: Article | null;
}

const thStyle: React.CSSProperties = { padding: 8, border: "1px solid #333" };
const tdStyle: React.CSSProperties = { padding: 8, border: "1px solid #ccc" };

export function BonDocument({ type, op, art }: BonDocumentProps) {
  if (!op) return <p className="empty">Sélectionnez un bon</p>;

  const unitPrice = Number(op.prix_unit ?? art?.prix ?? 0);
  const total = (Number(op.qte) || 0) * unitPrice;
  const isEntree = type === "entree";
  const fournisseur = isEntree ? (op as Entree).fournisseur : "";
  const bl = isEntree ? (op as Entree).bl : "";
  const facture = isEntree ? (op as Entree).facture : "";
  const atelier = isEntree ? "" : (op as Sortie).atelier;
  const motif = isEntree ? "" : (op as Sortie).motif;

  return (
    <div className="print-bon">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #003366", paddingBottom: 10 }}>
        <img src={ANEP_LOGO_DATA_URL} alt="ANEP" style={{ width: 220, height: 90, objectFit: "contain" }} />
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0 }}>{isEntree ? "BON DE RÉCEPTION" : "BON DE SORTIE"}</h2>
          <p style={{ margin: 0, color: "#666" }}>N° {op.reference ?? op.id}</p>
        </div>
      </div>

      {isEntree ? (
        <div className="info-box">
          <p><strong>Date :</strong> {op.date}</p>
          <p><strong>Fournisseur :</strong> {fournisseur}</p>
          <p>
            <strong>N° BL :</strong> {bl || "-"} | <strong>Facture :</strong> {facture || "-"}
          </p>
        </div>
      ) : (
        <div className="info-box">
          <p><strong>Date :</strong> {op.date}</p>
          <p><strong>Atelier / Chantier :</strong> {atelier}</p>
          <p><strong>Motif :</strong> {motif}</p>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", margin: "15px 0" }}>
        <thead>
          <tr style={{ background: "#003366", color: "white" }}>
            <th style={thStyle}>Code</th>
            <th style={thStyle}>Désignation</th>
            <th style={thStyle}>Unité</th>
            <th style={thStyle}>Quantité</th>
            <th style={thStyle}>Prix Unitaire (DZD)</th>
            <th style={thStyle}>Valeur Totale (DZD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>{op.code}</td>
            <td style={tdStyle}>{op.designation}</td>
            <td style={tdStyle}>{art?.unite || "Unité"}</td>
            <td style={{ ...tdStyle, textAlign: "center" }}><strong>{op.qte}</strong></td>
            <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(unitPrice)}</td>
            <td style={{ ...tdStyle, textAlign: "right" }}><strong>{fmt(total)}</strong></td>
          </tr>
          <tr className="total-row">
            <td colSpan={5} style={{ ...tdStyle, textAlign: "right", fontWeight: "bold" }}>TOTAL GÉNÉRAL</td>
            <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold", fontSize: 16, color: "#003366" }}>
              {fmt(total)} DZD
            </td>
          </tr>
        </tbody>
      </table>

      <div className="signatures">
        <div className="sign-box">Le Magasinier<br /><br /><br />Signature</div>
        <div className="sign-box">{isEntree ? "Le Réceptionnaire" : "Le Bénéficiaire"}<br /><br /><br />Signature</div>
      </div>
    </div>
  );
}
