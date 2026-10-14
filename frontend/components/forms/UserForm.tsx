"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/components/app/AppContext";
import { api } from "@/lib/api";
import { PERMISSIONS } from "@/lib/constants";
import { errorMessage } from "@/lib/helpers";
import type { Role, User } from "@/lib/types";

interface UserFormState {
  login: string;
  name: string;
  pass: string;
  role: Role;
}

const EMPTY: UserFormState = { login: "", name: "", pass: "", role: "magasinier" };

export function UserForm({ edit, onClose }: { edit?: User | null; onClose: () => void }) {
  const { showToast, refresh, canManageUsers } = useApp();
  const [f, setF] = useState<UserFormState>(
    edit ? { login: edit.username, name: edit.name, pass: "", role: edit.role } : { ...EMPTY },
  );
  const [saving, setSaving] = useState(false);
  const editing = !!edit;

  async function save() {
    if (saving) return;
    if (!canManageUsers) { showToast("Admin uniquement", "error"); return; }
    if (!f.login || !f.name) { showToast("Champs obligatoires", "error"); return; }
    if (!editing && !f.pass) { showToast("Mot de passe obligatoire", "error"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { username: f.login, name: f.name, role: f.role };
      if (f.pass) payload.password = f.pass;
      if (editing) await api("/users/" + edit!.id + "/", { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/users/", { method: "POST", body: JSON.stringify(payload) });
      showToast("Utilisateur enregistré", "success");
      await refresh(["users", "audit"]);
      onClose();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Modifier l'Utilisateur" : "Nouvel Utilisateur"} onClose={onClose}>
      <div className="form-group">
        <label>Login *</label>
        <input value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Nom complet *</label>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </div>
      <div className="form-group">
        <label>{editing ? "Mot de passe (vide = inchangé)" : "Mot de passe *"}</label>
        <input type="password" value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Rôle *</label>
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
          <option value="admin">Admin</option>
          <option value="magasinier">Magasinier</option>
          <option value="consultant">Consultant</option>
        </select>
      </div>
      <div className="form-group perm-preview" style={{ background: "#f4f8ff", border: "1px solid #d8e2f0", borderRadius: 8, padding: 10, fontSize: 12 }}>
        <strong>Permissions :</strong>
        {(PERMISSIONS[f.role]?.perms || []).map((p) => <div key={p}>✅ {p}</div>)}
      </div>
      <div className="modal-actions">
        <Button variant="secondary" disabled={saving} onClick={onClose}>Annuler</Button>
        <Button variant="success" disabled={saving} onClick={save}>{saving ? "…" : "Enregistrer"}</Button>
      </div>
    </Modal>
  );
}
