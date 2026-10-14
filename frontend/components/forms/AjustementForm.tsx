"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/components/app/AppContext";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/helpers";
import type { Ajustement } from "@/lib/types";

interface AjustementFormState {
  code: string;
  var: number | string;
  date: string;
  mot: string;
  jus: string;
}

const EMPTY: AjustementFormState = { code: "", var: 0, date: "", mot: "", jus: "" };

export function AjustementForm({ edit, onClose }: { edit?: Ajustement | null; onClose: () => void }) {
  const { stock, showToast, refresh, canWrite } = useApp();
  const [f, setF] = useState<AjustementFormState>(
    edit ? { code: edit.code, var: edit.variation, date: edit.date, mot: edit.motif, jus: edit.justificatif } : { ...EMPTY },
  );
  const [saving, setSaving] = useState(false);
  const editing = !!edit;
  const article = f.code ? stock.articles.find((a) => a.code === f.code) : null;

  async function save() {
    if (saving) return;
    if (!canWrite) { showToast("Permissions insuffisantes", "error"); return; }
    if (!f.code || !f.var || Number(f.var) === 0 || !f.mot) { showToast("Champs obligatoires", "error"); return; }
    setSaving(true);
    try {
      const payload = { code: f.code, variation: Number(f.var), motif: f.mot, justificatif: f.jus, date: f.date || undefined };
      if (editing) await api("/ajustements/" + edit!.id + "/", { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/ajustements/", { method: "POST", body: JSON.stringify(payload) });
      showToast("Ajustement enregistré", "success");
      await refresh(["ajustements", "articles", "mouvements", "dashboard", "alertes", "audit"]);
      onClose();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Modifier l'Ajustement" : "Nouvel Ajustement"} onClose={onClose}>
      <div className="form-group">
        <label>Article *</label>
        <select value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })}>
          <option value="">-- Choisir --</option>
          {stock.articles.map((a) => <option key={a.code} value={a.code}>{a.code} - {a.designation}</option>)}
        </select>
        {article && (
          <small style={{ display: "block", marginTop: 4, color: "#555" }}>
            💡 Stock dispo : <strong>{article.stock_dispo}</strong>
          </small>
        )}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Variation *</label>
          <input type="number" value={f.var} onChange={(e) => setF({ ...f, var: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label>Motif *</label>
        <textarea value={f.mot} onChange={(e) => setF({ ...f, mot: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Justificatif</label>
        <input value={f.jus} onChange={(e) => setF({ ...f, jus: e.target.value })} />
      </div>
      <div className="modal-actions">
        <Button variant="secondary" disabled={saving} onClick={onClose}>Annuler</Button>
        <Button variant="success" disabled={saving} onClick={save}>{saving ? "…" : "Valider"}</Button>
      </div>
    </Modal>
  );
}
