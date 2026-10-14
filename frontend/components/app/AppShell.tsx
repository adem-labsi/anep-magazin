"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoginBox } from "@/components/auth/LoginBox";
import { AjustementForm } from "@/components/forms/AjustementForm";
import { ArticleForm } from "@/components/forms/ArticleForm";
import { EntreeForm } from "@/components/forms/EntreeForm";
import { InventaireForm } from "@/components/forms/InventaireForm";
import { SortieForm } from "@/components/forms/SortieForm";
import { UserForm } from "@/components/forms/UserForm";
import { AjustementsModule } from "@/components/modules/AjustementsModule";
import { AlertesModule } from "@/components/modules/AlertesModule";
import { ArticlesModule } from "@/components/modules/ArticlesModule";
import { AuditModule } from "@/components/modules/AuditModule";
import { BackupModule } from "@/components/modules/BackupModule";
import { BonsModule } from "@/components/modules/BonsModule";
import { DashboardModule } from "@/components/modules/DashboardModule";
import { EntreesModule } from "@/components/modules/EntreesModule";
import { InventaireModule } from "@/components/modules/InventaireModule";
import { MouvementsModule } from "@/components/modules/MouvementsModule";
import { SortiesModule } from "@/components/modules/SortiesModule";
import { StockModule } from "@/components/modules/StockModule";
import { UsersModule } from "@/components/modules/UsersModule";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { AppProvider, type AppContextValue, type ConfirmOptions } from "@/components/app/AppContext";
import { api, authApi, setToken } from "@/lib/api";
import { EMPTY_SEARCH, NAV, PERMISSIONS, SEARCH_FIELDS } from "@/lib/constants";
import { buildExport, type CsvContext } from "@/lib/csv";
import { downloadFile, errorMessage } from "@/lib/helpers";
import { usePreferences } from "@/lib/hooks/usePreferences";
import { usePrint } from "@/lib/hooks/usePrint";
import { useSession } from "@/lib/hooks/useSession";
import { useStockData } from "@/lib/hooks/useStockData";
import { useToast } from "@/lib/hooks/useToast";
import { t } from "@/lib/i18n";
import { ANEP_LOGO_DATA_URL } from "@/lib/logo";
import type {
  Ajustement,
  Article,
  Entree,
  ModuleKey,
  SearchKey,
  SearchState,
  Sortie,
  User,
} from "@/lib/types";

type ModalState =
  | { name: "article"; edit?: Article }
  | { name: "entree"; edit?: Entree }
  | { name: "sortie"; edit?: Sortie }
  | { name: "ajust"; edit?: Ajustement }
  | { name: "inv" }
  | { name: "user"; edit?: User }
  | null;

interface ConfirmRequest {
  message: string;
  opts?: ConfirmOptions;
  resolve: (value: boolean) => void;
}

function BootSplash() {
  return (
    <div className="boot-splash" role="status" aria-live="polite">
      <div className="boot-spinner" />
      <img src={ANEP_LOGO_DATA_URL} className="boot-logo" alt="ANEP" />
    </div>
  );
}

export function AppShell() {
  const { themeDark, lang, toggleTheme, setLang, applyServerPrefs } = usePreferences();
  const { toast, showToast } = useToast();
  const session = useSession();

  const { user, hydrate, persistUser, clearUser, canWrite, canDelete, canManageUsers } = session;

  const onUnauthorized = useCallback(() => {
    clearUser();
    showToast("Session expirée, veuillez vous reconnecter", "error");
  }, [clearUser, showToast]);

  const stock = useStockData(showToast, onUnauthorized);
  const { printModule, printElement } = usePrint(showToast);

  const [mounted, setMounted] = useState(false);
  const [module, setModule] = useState<ModuleKey>("dashboard");
  const [search, setSearch] = useState<SearchState>({ ...EMPTY_SEARCH });
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  const load = stock.load;

  useEffect(() => {
    const hasSession = hydrate();
    if (!hasSession) {
      setMounted(true);
      return;
    }
    load().finally(() => setMounted(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tr = useCallback((key: string) => t(lang, key), [lang]);

  const setSearchField = useCallback((key: SearchKey, value: string) => {
    setSearch((s) => ({ ...s, [key]: value }));
  }, []);

  const resetSearch = useCallback((key: string) => {
    setSearch((s) => {
      const next = { ...s };
      (SEARCH_FIELDS[key] || []).forEach((k) => { next[k] = ""; });
      return next;
    });
    showToast("🔄 Filtres réinitialisés");
  }, [showToast]);

  const exportCSV = useCallback(
    (key: string) => {
      const ctx: CsvContext = {
        articles: stock.articles,
        entrees: stock.entrees,
        sorties: stock.sorties,
        ajustements: stock.ajustements,
        mouvements: stock.mouvements,
        inventaires: stock.inventaires,
        audit: stock.audit,
        users: stock.users,
        alertes: stock.alertes,
      };
      const exp = buildExport(key, ctx);
      if (!exp) return;
      downloadFile(exp.filename, exp.content, "text/csv");
      showToast("📊 Export CSV généré");
    },
    [stock, showToast],
  );

  const confirm = useCallback(
    (message: string, opts?: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setConfirmReq({ message, opts, resolve })),
    [],
  );

  const resolveConfirm = useCallback((value: boolean) => {
    setConfirmReq((req) => {
      req?.resolve(value);
      return null;
    });
  }, []);

  async function doLogin(username: string, password: string) {
    try {
      const r = await authApi.login(username, password);
      setToken(r.token);
      persistUser(r.user);
      applyServerPrefs(r.user);
      await load();
      showToast("Bienvenue " + (r.user.name || r.user.username), "success");
    } catch (e) {
      showToast(errorMessage(e, "Identifiants incorrects"), "error");
    }
  }

  function doLogout() {
    try { authApi.logout().catch(() => {}); } catch { /* ignore */ }
    clearUser();
    showToast("Déconnexion réussie");
  }

  async function cancelOp(type: string, id: number) {
    if (!canDelete) { showToast("Admin uniquement"); return; }
    if (!(await confirm("Annuler ?"))) return;
    try {
      await api("/" + type + "/" + id + "/cancel/", { method: "POST" });
      showToast("Annulé");
      await load();
    } catch (e) {
      showToast(errorMessage(e));
    }
  }

  async function delArticle(id: number) {
    if (!canDelete) { showToast("Admin uniquement"); return; }
    if (!(await confirm("Supprimer ?"))) return;
    try {
      await api("/articles/" + id + "/", { method: "DELETE" });
      showToast("Supprimé");
      await load();
    } catch (e) {
      showToast(errorMessage(e));
    }
  }

  async function delUser(u: User) {
    if (!canManageUsers) { showToast("Admin uniquement"); return; }
    if (!(await confirm(`Supprimer ${u.name || u.username} ?`))) return;
    try {
      await api("/users/" + u.id + "/", { method: "DELETE" });
      showToast("Utilisateur supprimé");
      await load();
    } catch (e) {
      showToast(errorMessage(e));
    }
  }

  const context = useMemo<AppContextValue>(
    () => ({
      lang,
      t: tr,
      stock,
      refresh: stock.refresh,
      search,
      setSearchField,
      resetSearch,
      exportCSV,
      printModule,
      printElement,
      showToast,
      confirm,
      canWrite,
      canDelete,
      canManageUsers,
    }),
    [
      lang, tr, stock, search, setSearchField, resetSearch, exportCSV,
      printModule, printElement, showToast, confirm, canWrite, canDelete, canManageUsers,
    ],
  );

  if (!mounted) {
    return <BootSplash />;
  }

  if (!user) {
    return (
      <>
        <LoginBox lang={lang} onLogin={doLogin} />
        <Toast toast={toast} />
      </>
    );
  }

  const navItems = NAV.filter((item) => item.key !== "utilisateurs" || canManageUsers);

  return (
    <AppProvider value={context}>
      <div>
        <div className="session-exit-zone">
          <button className="btn-logout" onClick={doLogout}>{tr("logout")}</button>
        </div>
        <header>
          <div className="logo-container">
            <img src={ANEP_LOGO_DATA_URL} className="logo-svg" alt="ANEP" />
            <div className="header-info">
              <h1>{tr("title")}</h1>
              <div className="sub">{tr("offline")}</div>
            </div>
          </div>
          <div className="header-right">
            <span className="user-badge">
              {PERMISSIONS[user.role]?.label?.split(" ")[0] || user.role} {user.name || user.username}
            </span>
            <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value as "fr" | "ar")}>
              <option value="fr">FR — Français</option>
              <option value="ar">عربي — العربية</option>
            </select>
            <button className="theme-toggle" onClick={toggleTheme}>
              {themeDark
                ? (lang === "ar" ? "☀️ وضع مشرق" : "☀️ Mode clair")
                : (lang === "ar" ? "🌙 وضع ليلي" : "🌙 Mode sombre")}
            </button>
          </div>
        </header>
        <nav id="mainNav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={module === item.key ? "active" : ""}
              onClick={() => setModule(item.key)}
            >
              {tr(item.labelKey)}
            </button>
          ))}
        </nav>
        <main>
          {module === "dashboard" && <DashboardModule />}
          {module === "articles" && (
            <ArticlesModule
              onNew={() => setModal({ name: "article" })}
              onEdit={(a) => setModal({ name: "article", edit: a })}
              onDelete={(a) => delArticle(a.id)}
            />
          )}
          {module === "entrees" && (
            <EntreesModule
              onNew={() => setModal({ name: "entree" })}
              onEdit={(e) => setModal({ name: "entree", edit: e })}
              onCancel={(id) => cancelOp("entrees", id)}
            />
          )}
          {module === "sorties" && (
            <SortiesModule
              onNew={() => setModal({ name: "sortie" })}
              onEdit={(s) => setModal({ name: "sortie", edit: s })}
              onCancel={(id) => cancelOp("sorties", id)}
            />
          )}
          {module === "ajustements" && (
            <AjustementsModule
              onNew={() => setModal({ name: "ajust" })}
              onEdit={(a) => setModal({ name: "ajust", edit: a })}
              onCancel={(id) => cancelOp("ajustements", id)}
            />
          )}
          {module === "stock" && <StockModule />}
          {module === "mouvements" && <MouvementsModule />}
          {module === "alertes" && <AlertesModule />}
          {module === "inventaire" && <InventaireModule onNew={() => setModal({ name: "inv" })} />}
          {module === "bons" && <BonsModule />}
          {module === "sauvegarde" && <BackupModule />}
          {module === "audit" && <AuditModule />}
          {module === "utilisateurs" && canManageUsers && (
            <UsersModule
              onNew={() => setModal({ name: "user" })}
              onEdit={(u) => setModal({ name: "user", edit: u })}
              onDelete={delUser}
            />
          )}
        </main>

        {modal?.name === "article" && (
          <ArticleForm edit={modal.edit} onClose={() => setModal(null)} />
        )}
        {modal?.name === "entree" && (
          <EntreeForm edit={modal.edit} onClose={() => setModal(null)} />
        )}
        {modal?.name === "sortie" && (
          <SortieForm edit={modal.edit} onClose={() => setModal(null)} />
        )}
        {modal?.name === "ajust" && (
          <AjustementForm edit={modal.edit} onClose={() => setModal(null)} />
        )}
        {modal?.name === "inv" && <InventaireForm onClose={() => setModal(null)} />}
        {modal?.name === "user" && (
          <UserForm edit={modal.edit} onClose={() => setModal(null)} />
        )}

        {confirmReq && (
          <ConfirmDialog message={confirmReq.message} opts={confirmReq.opts} onResolve={resolveConfirm} />
        )}

        <Toast toast={toast} />
      </div>
    </AppProvider>
  );
}
