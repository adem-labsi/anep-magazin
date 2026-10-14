"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/components/app/AppContext";
import { api } from "@/lib/api";
import { errorMessage, fmt } from "@/lib/helpers";
import type { Entree } from "@/lib/types";

interface EntreeFormState {
  code: string;
  qte: number | string;
  pri: number | string;
  date: string;
  fou: string;
  fac: string;
  bl: string;
}

const EMPTY: EntreeFormState = { code: "", qte: 1, pri: "", date: "", fou: "", fac: "", bl: "" };

export function EntreeForm({ edit, onClose }: { edit?: Entree | null; onClose: () => void }) {
  const { stock, showToast, refresh, confirm, canWrite } = useApp();
  const [f, setF] = useState<EntreeFormState>(
    edit
      ? { code: edit.code, qte: edit.qte, pri: edit.prix_unit, date: edit.date, fou: edit.fournisseur, fac: edit.facture, bl: edit.bl }
      : { ...EMPTY },
  );
  const [saving, setSaving] = useState(false);
  const editing = !!edit;
  const article = f.code ? stock.articles.find((a) => a.code === f.code) : null;

  async function save() {
    if (saving) return;
    if (!canWrite) { showToast("Permissions insuffisantes", "error"); return; }
    if (!f.code || !f.qte || Number(f.qte) <= 0 || !f.fou) { showToast("Champs obligatoires", "error"); return; }
    const payload: Record<string, unknown> = {
      code: f.code,
      qte: Number(f.qte),
      fournisseur: f.fou,
      facture: f.fac,
      bl: f.bl,
      date: f.date || undefined,
    };
    if (f.pri !== "") payload.prix_unit = Number(f.pri);
    if (!editing && f.fac && stock.entrees.some((e) => e.facture === f.fac && e.statut !== "Annulé")) {
      if (!(await confirm("⚠️ Facture déjà utilisée. Confirmer quand même ?"))) return;
      payload.force_facture = true;
    }
    setSaving(true);
    try {
      if (editing) {
        await api("/entrees/" + edit!.id + "/", { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/entrees/", { method: "POST", body: JSON.stringify(payload) });
      }
      showToast("Réception enregistrée", "success");
      await refresh(["entrees", "articles", "mouvements", "dashboard", "alertes", "audit"]);
      onClose();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Modifier l'Entrée" : "Nouvelle Entrée"} onClose={onClose}>
      <div className="form-group">
        <label>Article *</label>
        <select value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })}>
          <option value="">-- Choisir --</option>
          {stock.articles.map((a) => <option key={a.code} value={a.code}>{a.code} - {a.designation}</option>)}
        </select>
        {article && (
          <small style={{ display: "block", marginTop: 4, color: "#555" }}>
            💡 Prix actuel : <strong>{fmt(article.prix)} DZD</strong> — Stock dispo : <strong>{article.stock_dispo}</strong>
          </small>
        )}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Quantité *</label>
          <input type="number" min="1" value={f.qte} onChange={(e) => setF({ ...f, qte: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Prix d&apos;achat</label>
          <input type="number" step="0.01" value={f.pri} onChange={(e) => setF({ ...f, pri: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label>Date</label>
        <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Fournisseur *</label>
        <input value={f.fou} onChange={(e) => setF({ ...f, fou: e.target.value })} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>N° Facture</label>
          <input value={f.fac} onChange={(e) => setF({ ...f, fac: e.target.value })} />
        </div>
        <div className="form-group">
          <label>N° BL</label>
          <input value={f.bl} onChange={(e) => setF({ ...f, bl: e.target.value })} />
        </div>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" disabled={saving} onClick={onClose}>Annuler</Button>
        <Button variant="success" disabled={saving} onClick={save}>{saving ? "…" : "Valider"}</Button>
      </div>
    </Modal>
  );
}
