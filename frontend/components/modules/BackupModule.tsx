"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toolbar } from "@/components/ui/Toolbar";
import { useApp } from "@/components/app/AppContext";
import { api } from "@/lib/api";
import { downloadFile, errorMessage } from "@/lib/helpers";

export function BackupModule() {
  const { t, lang, showToast, refresh, confirm, canManageUsers } = useApp();
  const [busy, setBusy] = useState(false);

  async function doExport() {
    setBusy(true);
    try {
      const data = await api("/backup/");
      const json = JSON.stringify(data, null, 2);
      const filename = `ANEP_Sauvegarde_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
      downloadFile(filename, json, "application/json");
      showToast("💾 Sauvegarde téléchargée", "success");
    } catch (e) {
      showToast(errorMessage(e, "Erreur export"), "error");
    }
    setBusy(false);
  }

  async function doRestore(file: File | null) {
    if (!file) { showToast(lang === "ar" ? "حدد ملفًا" : "Sélectionnez un fichier"); return; }
    if (!(await confirm("⚠️ Remplacer toutes les données ?", { danger: true }))) return;
    setBusy(true);
    try {
      const text = await file.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        showToast("Fichier invalide ou structure incompatible", "error");
        setBusy(false);
        return;
      }
      await api("/backup/restore/", { method: "POST", body: JSON.stringify(data) });
      showToast("✅ Restauration réussie");
      await refresh();
    } catch (e) {
      showToast(errorMessage(e, "Restauration impossible"), "error");
    }
    setBusy(false);
  }

  async function doReset() {
    if (!canManageUsers) { showToast("Admin uniquement", "error"); return; }
    if (!(await confirm("⚠️ EFFACER TOUTES LES DONNÉES ?", { danger: true }))) return;
    if (!(await confirm("Confirmer définitivement ?", { danger: true }))) return;
    setBusy(true);
    try {
      await api("/backup/reset/", { method: "POST" });
      showToast("🔃 Données réinitialisées");
      await refresh();
    } catch (e) {
      showToast(errorMessage(e, "Échec réinitialisation"), "error");
    }
    setBusy(false);
  }

  return (
    <section id="module-sauvegarde" className="module active">
      <h2>{t("backupTitle")}</h2>
      <div className="desc">
        {lang === "ar" ? "الاحتفاظ بالبيانات واستعادتها من الخادم." : "Les données sont persistées côté serveur PostgreSQL."}
      </div>
      <Toolbar>
        <Button variant="success" disabled={busy} onClick={doExport}>💾 Télécharger JSON</Button>
        <label className="btn warn no-print" style={{ cursor: "pointer" }}>
          ↥ Restaurer
          <input type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(e) => doRestore(e.target.files?.[0] || null)} />
        </label>
        {canManageUsers && <Button variant="danger" disabled={busy} onClick={doReset}>🗑️ Tout effacer</Button>}
        <Button variant="secondary" onClick={() => refresh()}>{t("refresh")}</Button>
      </Toolbar>
      <div className="table-container">
        <div style={{ padding: 16, fontSize: 13, color: "#5d6b7d" }}>
          {lang === "ar"
            ? "تصدير يسترجع كل البيانات: المواد، الإدخالات، الإخراجات، التسويات، الحركات، الجرد وسجل التدقيق."
            : "L'export contient l'ensemble des données : articles, entrées, sorties, ajustements, mouvements, inventaires et journal d'audit. La restauration remplace intégralement le contenu actuel."}
        </div>
      </div>
    </section>
  );
}
