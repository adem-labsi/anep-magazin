"use client";

import { useMemo, useRef, useState } from "react";
import { BonDocument } from "@/components/bons/BonDocument";
import { Button } from "@/components/ui/Button";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";

export function BonsModule() {
  const { t, stock, lang, printElement } = useApp();
  const [selEnt, setSelEnt] = useState("");
  const [selSor, setSelSor] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  const validEnt = useMemo(() => stock.entrees.filter((e) => e.statut !== "Annulé"), [stock.entrees]);
  const validSor = useMemo(() => stock.sorties.filter((e) => e.statut !== "Annulé"), [stock.sorties]);

  const previewOp = selEnt
    ? stock.entrees.find((e) => String(e.id) === selEnt) || null
    : stock.sorties.find((e) => String(e.id) === selSor) || null;
  const previewArt = previewOp ? stock.articles.find((a) => a.code === previewOp.code) || null : null;
  const type = selEnt ? "entree" : "sortie";

  return (
    <section id="module-bons" className="module active">
      <h2>{t("vouchersTitle")}</h2>
      <Toolbar>
        <label>Bon d&apos;Entrée :</label>
        <select value={selEnt} onChange={(e) => { setSelEnt(e.target.value); setSelSor(""); }}>
          <option value="">-- Choisir --</option>
          {validEnt.map((e) => <option key={e.id} value={e.id}>{e.reference} — {e.date} — {e.fournisseur}</option>)}
        </select>
        <label>Bon de Sortie :</label>
        <select value={selSor} onChange={(e) => { setSelSor(e.target.value); setSelEnt(""); }}>
          <option value="">-- Choisir --</option>
          {validSor.map((e) => <option key={e.id} value={e.id}>{e.reference} — {e.date} — {e.atelier}</option>)}
        </select>
        <Button
          variant="success"
          className="no-print"
          disabled={!previewOp}
          onClick={() => printElement(previewRef.current, "Bon")}
        >
          🖨️ Imprimer le bon
        </Button>
      </Toolbar>
      {!previewOp && <p className="empty">{lang === "ar" ? "حدد سندًا" : "Sélectionnez un bon"}</p>}
      {previewOp && (
        <div id="bonPreview" ref={previewRef}>
          <BonDocument type={type} op={previewOp} art={previewArt} />
        </div>
      )}
    </section>
  );
}
