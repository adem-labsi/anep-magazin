"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/components/app/AppContext";
import { api } from "@/lib/api";
import { CATEGORIES, UNITES } from "@/lib/constants";
import { errorMessage } from "@/lib/helpers";
import type { Article } from "@/lib/types";

interface ArticleFormState {
  des: string;
  cat: string;
  uni: string;
  ini: number | string;
  seu: number | string;
  pri: number | string;
  emp: string;
}

const EMPTY: ArticleFormState = { des: "", cat: "", uni: "Unité", ini: 0, seu: 5, pri: 0, emp: "" };

export function ArticleForm({ edit, onClose }: { edit?: Article | null; onClose: () => void }) {
  const { stock, showToast, refresh, canWrite } = useApp();
  const [f, setF] = useState<ArticleFormState>(
    edit
      ? { des: edit.designation, cat: edit.categorie, uni: edit.unite, ini: edit.initial, seu: edit.seuil, pri: edit.prix, emp: edit.emplacement }
      : { ...EMPTY },
  );
  const [saving, setSaving] = useState(false);
  const editing = !!edit;

  async function save() {
    if (saving) return;
    if (!canWrite) { showToast("Permissions insuffisantes", "error"); return; }
    if (!f.des || !f.cat) { showToast("Désignation et catégorie obligatoires", "error"); return; }
    const dupe = stock.articles.some(
      (a) => a.designation.trim().toLowerCase() === f.des.trim().toLowerCase() && (editing ? a.id !== edit!.id : true),
    );
    if (dupe) { showToast("⚠️ Une désignation identique existe déjà"); return; }
    setSaving(true);
    try {
      const payload = {
        designation: f.des,
        categorie: f.cat,
        unite: f.uni,
        initial: Number(f.ini) || 0,
        seuil: Number(f.seu) || 0,
        prix: Number(f.pri) || 0,
        emplacement: f.emp || "-",
      };
      if (editing) {
        await api("/articles/" + edit!.id + "/", { method: "PATCH", body: JSON.stringify(payload) });
        showToast("Article modifié", "success");
      } else {
        await api("/articles/", { method: "POST", body: JSON.stringify(payload) });
        showToast("Article créé", "success");
      }
      await refresh(["articles", "mouvements", "dashboard", "alertes", "audit"]);
      onClose();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Modifier Article" : "Nouvel Article"} onClose={onClose}>
      <div className="form-group">
        <label>Désignation *</label>
        <input value={f.des} onChange={(e) => setF({ ...f, des: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Catégorie *</label>
        <select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>
          <option value="">-- Choisir --</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Unité</label>
        <select value={f.uni} onChange={(e) => setF({ ...f, uni: e.target.value })}>
          {UNITES.map((u) => <option key={u}>{u}</option>)}
        </select>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Stock Initial</label>
          <input type="number" value={f.ini} onChange={(e) => setF({ ...f, ini: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Seuil Min</label>
          <input type="number" value={f.seu} onChange={(e) => setF({ ...f, seu: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label>Prix Unitaire</label>
        <input type="number" step="0.01" value={f.pri} onChange={(e) => setF({ ...f, pri: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Emplacement</label>
        <input value={f.emp} onChange={(e) => setF({ ...f, emp: e.target.value })} />
      </div>
      <div className="modal-actions">
        <Button variant="secondary" disabled={saving} onClick={onClose}>Annuler</Button>
        <Button variant="success" disabled={saving} onClick={save}>{saving ? "…" : "Enregistrer"}</Button>
      </div>
    </Modal>
  );
}
