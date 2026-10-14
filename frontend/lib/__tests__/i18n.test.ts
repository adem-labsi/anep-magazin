import { describe, it, expect } from "vitest";
import { I18N, t } from "../i18n";
import { PERMISSIONS } from "../constants";

describe("i18n", () => {
  it("provides fr and ar dictionaries", () => {
    expect(I18N.fr.navDashboard).toContain("Tableau de bord");
    expect(I18N.ar.navDashboard).toContain("لوحة التحكم");
  });

  it("selects the right language", () => {
    expect(t("ar", "navStock")).toBe(I18N.ar.navStock);
    expect(t("fr", "navStock")).toBe(I18N.fr.navStock);
  });

  it("falls back to French and then to the key", () => {
    expect(t("xx", "navUsers")).toBe(I18N.fr.navUsers);
    expect(t("fr", "nonexistent.key")).toBe("nonexistent.key");
  });
});

describe("PERMISSIONS", () => {
  it("maps the three roles", () => {
    expect(PERMISSIONS.admin.perms).toContain("Gérer utilisateurs");
    expect(PERMISSIONS.magasinier.perms).not.toContain("Gérer utilisateurs");
    expect(PERMISSIONS.consultant.perms).not.toContain("Créer");
  });
});
