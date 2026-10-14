"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/components/app/AppContext";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/helpers";
import type { Sortie } from "@/lib/types";

interface SortieFormState {
  code: string;
  qte: number | string;
  date: string;
  ate: string;
  mot: string;
}

const EMPTY: SortieFormState = { code: "", qte: 1, date: "", ate: "", mot: "" };

export function SortieForm({ edit, onClose }: { edit?: Sortie | null; onClose: () => void }) {
  const { stock, showToast, refresh, canWrite } = useApp();
  const [f, setF] = useState<SortieFormState>(
    edit ? { code: edit.code, qte: edit.qte, date: edit.date, ate: edit.atelier, mot: edit.motif } : { ...EMPTY },
  );
  const [saving, setSaving] = useState(false);
  const editing = !!edit;
  const article = f.code ? stock.articles.find((a) => a.code === f.code) : null;

  async function save() {
    if (saving) return;
    if (!canWrite) { showToast("Permissions insuffisantes", "error"); return; }
    if (!f.code || !f.qte || Number(f.qte) <= 0 || !f.ate || !f.mot) { showToast("Champs obligatoires", "error"); return; }
    setSaving(true);
    try {
      const payload = { code: f.code, qte: Number(f.qte), atelier: f.ate, motif: f.mot, date: f.date || undefined };
      if (editing) await api("/sorties/" + edit!.id + "/", { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/sorties/", { method: "POST", body: JSON.stringify(payload) });
      showToast("Sortie enregistrée", "success");
      await refresh(["sorties", "articles", "mouvements", "dashboard", "alertes", "audit"]);
      onClose();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Modifier la Sortie" : "Nouvelle Sortie"} onClose={onClose}>
      <div className="form-group">
        <label>Article *</label>
        <select value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })}>
          <option value="">-- Choisir --</option>
          {stock.articles.map((a) => <option key={a.code} value={a.code}>{a.code} - {a.designation}</option>)}
        </select>
        {article && (
          <small style={{ display: "block", marginTop: 4, color: "#555" }}>
            💡 Stock dispo : <strong>{article.stock_dispo}</strong>{" "}
            {article.stock_dispo <= 0 ? <span className="badge danger">Rupture</span> : null}
          </small>
        )}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Quantité *</label>
          <input type="number" min="1" value={f.qte} onChange={(e) => setF({ ...f, qte: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label>Atelier *</label>
        <input value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Motif *</label>
        <input value={f.mot} onChange={(e) => setF({ ...f, mot: e.target.value })} />
      </div>
      <div className="modal-actions">
        <Button variant="secondary" disabled={saving} onClick={onClose}>Annuler</Button>
        <Button variant="success" disabled={saving} onClick={save}>{saving ? "…" : "Valider"}</Button>
      </div>
    </Modal>
  );
}
