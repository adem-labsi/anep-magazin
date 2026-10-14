"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/components/app/AppContext";
import { api } from "@/lib/api";
import { errorMessage, todayStr } from "@/lib/helpers";

export function InventaireForm({ onClose }: { onClose: () => void }) {
  const { stock, showToast, refresh, canWrite } = useApp();
  const [type, setType] = useState("Mensuel");
  const [date, setDate] = useState(todayStr());
  const [phys, setPhys] = useState<Record<string, number>>(
    () => Object.fromEntries(stock.articles.map((a) => [a.code, 0])),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    if (!canWrite) { showToast("Permissions insuffisantes", "error"); return; }
    const lines = stock.articles.map((a) => ({ code: a.code, physique: Number(phys[a.code] ?? 0) }));
    setSaving(true);
    try {
      await api("/inventaires/", { method: "POST", body: JSON.stringify({ type, date, lines }) });
      showToast("Inventaire clôturé", "success");
      await refresh(["inventaires", "audit"]);
      onClose();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nouvel Inventaire" onClose={onClose} wide>
      <div className="form-row">
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Mensuel</option>
            <option>Annuel</option>
          </select>
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {stock.articles.map((a) => (
          <div key={a.code} className="form-group" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ flex: 1, margin: 0 }}>
              {a.code} - {a.designation} <small>(théorique: {a.stock_dispo})</small>
            </label>
            <input
              type="number"
              min="0"
              value={phys[a.code] ?? 0}
              onChange={(e) => setPhys({ ...phys, [a.code]: Number(e.target.value) })}
              style={{ width: 100 }}
            />
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <Button variant="secondary" disabled={saving} onClick={onClose}>Annuler</Button>
        <Button variant="success" disabled={saving} onClick={save}>{saving ? "…" : "Valider"}</Button>
      </div>
    </Modal>
  );
}
