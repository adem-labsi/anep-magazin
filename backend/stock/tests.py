from django.test import TestCase
from django.core.management import call_command
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from decimal import Decimal
from io import StringIO

from .models import Article, Entree, Sortie, Ajustement, Mouvement, Inventaire, AuditLog
from . import services

User = get_user_model()


def create_users():
    admin, _ = User.objects.get_or_create(
        username="admin",
        defaults=dict(password="pbkdf2_sha256$unused", name="Admin",
                      role="admin", is_staff=True, is_superuser=True),
    )
    admin.set_password("admin123")
    admin.name = "Admin"
    admin.role = "admin"
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()
    User.objects.get_or_create(
        username="magasin", defaults=dict(name="Magasin", role="magasinier")
    )
    User.objects.get_or_create(
        username="consult", defaults=dict(name="Consult", role="consultant")
    )
    return admin


class StockCalculationTests(TestCase):
    def setUp(self):
        self.art = Article.objects.create(
            code="ART-TEST001", designation="Test Article", categorie="Autre",
            initial=10, seuil=5, prix=Decimal("100.00"),
        )

    def test_stock_after_entry_exit_adjustment(self):
        Entree.objects.create(
            reference="ENT-TEST", date="2026-01-01", code=self.art.code,
            designation=self.art.designation, qte=5, prix_unit=self.art.prix,
            valeur=Decimal("500.00"), fournisseur="F", statut="Validé",
        )
        self.assertEqual(services.stock_dispo(self.art.code, self.art), 15)

        Sortie.objects.create(
            reference="SOR-TEST", date="2026-01-02", code=self.art.code,
            designation=self.art.designation, qte=2, prix_unit=self.art.prix,
            valeur=Decimal("200.00"), atelier="A", motif="M", statut="Validé",
        )
        self.assertEqual(services.stock_dispo(self.art.code, self.art), 13)

        Ajustement.objects.create(
            reference="AJU-TEST", date="2026-01-03", code=self.art.code,
            designation=self.art.designation, variation=-1,
            prix_unit=self.art.prix, valeur=Decimal("100.00"),
            motif="casse", statut="Validé",
        )
        self.assertEqual(services.stock_dispo(self.art.code, self.art), 12)

    def test_cancelled_operations_excluded_from_stock(self):
        Entree.objects.create(
            reference="ENT-X", date="2026-01-01", code=self.art.code,
            designation=self.art.designation, qte=5, prix_unit=self.art.prix,
            valeur=Decimal("500.00"), fournisseur="F", statut="Annulé",
        )
        self.assertEqual(services.stock_dispo(self.art.code, self.art), 10)


class AuthTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        create_users()

    def setUp(self):
        self.client = APIClient()

    def test_login_ok(self):
        r = self.client.post("/api/auth/login/", {"username": "Admin", "password": "admin123"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("token", r.data)
        self.assertEqual(r.data["user"]["role"], "admin")

    def test_login_bad_password(self):
        r = self.client.post("/api/auth/login/", {"username": "admin", "password": "wrong"})
        self.assertEqual(r.status_code, 401)

    def test_login_missing_fields(self):
        r = self.client.post("/api/auth/login/", {"username": "admin"})
        self.assertEqual(r.status_code, 400)

    def test_protected_endpoint_requires_auth(self):
        r = self.client.get("/api/articles/")
        self.assertEqual(r.status_code, 401)


class PermissionsTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        create_users()

    def setUp(self):
        self.client = APIClient()

    def _token(self, username, password):
        r = self.client.post("/api/auth/login/", {"username": username, "password": password})
        self.assertEqual(r.status_code, 200)
        return r.data["token"]

    def test_consultant_cannot_create_article(self):
        tok = self._token("consult", "cons123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")
        r = self.client.post("/api/articles/", {
            "designation": "X", "categorie": "Autre", "prix": "10.00",
        })
        self.assertEqual(r.status_code, 403)

    def test_consultant_can_read_articles(self):
        tok = self._token("consult", "cons123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")
        r = self.client.get("/api/articles/")
        self.assertEqual(r.status_code, 200)

    def test_magasinier_can_create_article(self):
        tok = self._token("magasin", "mag123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")
        r = self.client.post("/api/articles/", {
            "designation": "Article Test", "categorie": "Autre", "prix": "10.00",
            "initial": 5, "seuil": 2,
        })
        self.assertEqual(r.status_code, 201)
        self.assertIn("code", r.data)
        self.assertEqual(r.data["code"], "ART-000001")

    def test_magasinier_cannot_delete(self):
        tok = self._token("magasin", "mag123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")
        art = Article.objects.create(code="ART-1", designation="A", categorie="Autre", prix=Decimal("1.00"))
        r = self.client.delete(f"/api/articles/{art.id}/")
        self.assertEqual(r.status_code, 403)

    def test_magasinier_cannot_manage_users(self):
        tok = self._token("magasin", "mag123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")
        r = self.client.get("/api/users/")
        self.assertEqual(r.status_code, 403)


class EntreeSortieFlowTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        create_users()

    def setUp(self):
        Article.objects.create(code="ART-1", designation="A1", categorie="Autre",
                               initial=10, seuil=3, prix=Decimal("50.00"))
        self.client = APIClient()
        tok = self.client.post("/api/auth/login/", {"username": "magasin", "password": "mag123"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")

    def test_entree_increases_stock_and_creates_movement(self):
        before = services.stock_dispo("ART-1")
        r = self.client.post("/api/entrees/", {
            "code": "ART-1", "qte": 3, "fournisseur": "Fourn", "prix_unit": "55.00",
        })
        self.assertEqual(r.status_code, 201)
        art = Article.objects.get(code="ART-1")
        self.assertEqual(art.prix, Decimal("55.00"), "Entree should update article price")
        self.assertEqual(services.stock_dispo("ART-1", art), before + 3)
        self.assertTrue(Mouvement.objects.filter(type="Entrée", code="ART-1").exists())
        self.assertEqual(r.data["valeur"], "165.00")

    def test_entree_duplicate_invoice_blocked(self):
        self.client.post("/api/entrees/", {"code": "ART-1", "qte": 1, "fournisseur": "F", "facture": "FAC-1"})
        r = self.client.post("/api/entrees/", {"code": "ART-1", "qte": 1, "fournisseur": "F", "facture": "FAC-1"})
        self.assertEqual(r.status_code, 400)
        self.assertIn("facture_dupliquee", str(r.data.get("code", "")) or str(r.data))

    def test_entree_duplicate_invoice_forced(self):
        self.client.post("/api/entrees/", {"code": "ART-1", "qte": 1, "fournisseur": "F", "facture": "FAC-1"})
        r = self.client.post("/api/entrees/", {"code": "ART-1", "qte": 1, "fournisseur": "F", "facture": "FAC-1", "force_facture": True})
        self.assertEqual(r.status_code, 201)

    def test_entree_requires_fournisseur(self):
        r = self.client.post("/api/entrees/", {"code": "ART-1", "qte": 1})
        self.assertEqual(r.status_code, 400)

    def test_sortie_blocked_when_insufficient(self):
        r = self.client.post("/api/sorties/", {
            "code": "ART-1", "qte": 1000, "atelier": "A", "motif": "M",
        })
        self.assertEqual(r.status_code, 400)
        self.assertIn("BLOCAGE", r.data["detail"])

    def test_sortie_decreases_stock_and_movement(self):
        before = services.stock_dispo("ART-1")
        r = self.client.post("/api/sorties/", {
            "code": "ART-1", "qte": 4, "atelier": "A4", "motif": "Consommation",
        })
        self.assertEqual(r.status_code, 201)
        self.assertEqual(services.stock_dispo("ART-1"), before - 4)
        self.assertTrue(Mouvement.objects.filter(type="Sortie", code="ART-1").exists())

    def test_ajustement_and_stock(self):
        before = services.stock_dispo("ART-1")
        r = self.client.post("/api/ajustements/", {
            "code": "ART-1", "variation": -2, "motif": "casse",
        })
        self.assertEqual(r.status_code, 201)
        self.assertEqual(services.stock_dispo("ART-1"), before - 2)
        self.assertTrue(Mouvement.objects.filter(type="Ajustement").exists())

    def test_ajustement_requires_motif(self):
        r = self.client.post("/api/ajustements/", {"code": "ART-1", "variation": 1})
        self.assertEqual(r.status_code, 400)

    def test_cancel_requires_admin(self):
        r = self.client.post("/api/entrees/", {
            "code": "ART-1", "qte": 1, "fournisseur": "F",
        })
        ent_id = r.data["id"]
        r2 = self.client.post(f"/api/entrees/{ent_id}/cancel/")
        self.assertEqual(r2.status_code, 403)

    def test_cancel_admin_reverses_stock(self):
        self.client.credentials()
        tk = self.client.post("/api/auth/login/", {"username": "magasin", "password": "mag123"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        r = self.client.post("/api/entrees/", {"code": "ART-1", "qte": 5, "fournisseur": "F"})
        ent_id = r.data["id"]
        before = services.stock_dispo("ART-1")
        atok = self.client.post("/api/auth/login/", {"username": "admin", "password": "admin123"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {atok}")
        r2 = self.client.post(f"/api/entrees/{ent_id}/cancel/")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.data["statut"], "Annulé")
        self.assertEqual(services.stock_dispo("ART-1"), before - 5)

    def test_edit_entree_recomputes_value(self):
        r = self.client.post("/api/entrees/", {"code": "ART-1", "qte": 2, "fournisseur": "F", "prix_unit": "10.00"})
        ent_id = r.data["id"]
        r2 = self.client.patch(f"/api/entrees/{ent_id}/", {"qte": 3, "prix_unit": "20.00"})
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.data["valeur"], "60.00")

    def test_create_user_and_change_password(self):
        admin_tok = self.client.post("/api/auth/login/", {"username": "admin", "password": "admin123"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {admin_tok}")
        r = self.client.post("/api/users/", {
            "username": "boss", "name": "Boss", "password": "pass1", "role": "magasinier",
        })
        self.assertEqual(r.status_code, 201)
        uid = r.data["id"]
        r2 = self.client.patch(f"/api/users/{uid}/", {"password": "pass2", "name": "Boss2"})
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.data["name"], "Boss2")
        login = self.client.post("/api/auth/login/", {"username": "boss", "password": "pass2"})
        self.assertEqual(login.status_code, 200)

    def test_admin_cannot_be_deleted(self):
        admin_tok = self.client.post("/api/auth/login/", {"username": "admin", "password": "admin123"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {admin_tok}")
        admin = User.objects.get(username="admin")
        r = self.client.delete(f"/api/users/{admin.id}/")
        self.assertEqual(r.status_code, 403)


class PreferencesTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        create_users()

    def setUp(self):
        self.client = APIClient()
        tok = self.client.post("/api/auth/login/", {"username": "magasin", "password": "mag123"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")

    def test_requires_auth(self):
        self.client.credentials()
        r = self.client.get("/api/preferences/")
        self.assertEqual(r.status_code, 401)

    def test_defaults(self):
        r = self.client.get("/api/preferences/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["theme"], "light")
        self.assertEqual(r.data["lang"], "fr")

    def test_patch_persists(self):
        r = self.client.patch("/api/preferences/", {"theme": "dark", "lang": "ar"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data, {"theme": "dark", "lang": "ar"})
        again = self.client.get("/api/preferences/")
        self.assertEqual(again.data, {"theme": "dark", "lang": "ar"})

    def test_patch_invalid_value(self):
        r = self.client.patch("/api/preferences/", {"theme": "blue"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_login_returns_preferences(self):
        self.client.patch("/api/preferences/", {"theme": "dark", "lang": "ar"}, format="json")
        self.client.credentials()
        r = self.client.post("/api/auth/login/", {"username": "magasin", "password": "mag123"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["user"]["theme"], "dark")
        self.assertEqual(r.data["user"]["lang"], "ar")


class InventoryTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        create_users()

    def setUp(self):
        Article.objects.create(code="ART-1", designation="A1", categorie="Autre",
                               initial=10, seuil=3, prix=Decimal("50.00"))
        self.client = APIClient()
        tok = self.client.post("/api/auth/login/", {"username": "admin", "password": "admin123"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")

    def test_inventory_computes_discrepancy(self):
        r = self.client.post("/api/inventaires/", {
            "type": "Mensuel", "lines": [{"code": "ART-1", "physique": 7}],
        }, format="json")
        self.assertEqual(r.status_code, 201)
        line = r.data["lines"][0]
        self.assertEqual(line["theorique"], 10)
        self.assertEqual(line["physique"], 7)
        self.assertEqual(line["ecart"], -3)
        self.assertEqual(line["valeurEcart"], -150.0)
        self.assertEqual(r.data["ecart_total"], -3)
        self.assertEqual(r.data["val_ecart"], "-150.00")


class DashboardAndAlertsTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        create_users()

    def setUp(self):
        Article.objects.create(code="ART-1", designation="A1", categorie="Autre",
                               initial=0, seuil=5, prix=Decimal("10.00"))
        self.client = APIClient()
        tok = self.client.post("/api/auth/login/", {"username": "admin", "password": "admin123"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")

    def test_alertes_contains_rupture(self):
        r = self.client.get("/api/alertes/")
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.data["ruptures"], 1)

    def test_dashboard_shape(self):
        r = self.client.get("/api/dashboard/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("totalArticles", r.data)
        self.assertIn("bars", r.data)
        self.assertIn("articles", r.data)


class BackupTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        create_users()

    def setUp(self):
        Article.objects.create(code="ART-1", designation="A1", categorie="Autre",
                               initial=10, seuil=3, prix=Decimal("50.00"))
        self.client = APIClient()

    def _admin(self):
        tok = self.client.post("/api/auth/login/", {"username": "admin", "password": "admin123"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")

    def test_backup_requires_admin(self):
        tok = self.client.post("/api/auth/login/", {"username": "magasin", "password": "mag123"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")
        r = self.client.get("/api/backup/")
        self.assertEqual(r.status_code, 403)

    def test_export_restore_reset_roundtrip(self):
        self._admin()
        self.client.post("/api/entrees/", {"code": "ART-1", "qte": 3, "fournisseur": "F"})
        dump = self.client.get("/api/backup/").data
        self.assertIn("articles", dump)
        self.assertEqual(len(dump["articles"]), 1)
        self.assertGreaterEqual(len(dump["entrees"]), 1)
        self.assertGreaterEqual(len(dump["mouvements"]), 1)

        r = self.client.post("/api/backup/restore/", dump, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Article.objects.count(), 1)
        self.assertEqual(Entree.objects.count(), 1)

        r2 = self.client.post("/api/backup/reset/")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(Article.objects.count(), 0)
        self.assertEqual(Entree.objects.count(), 0)
        self.assertEqual(Mouvement.objects.count(), 0)
        self.assertTrue(AuditLog.objects.filter(action="Réinitialisation").exists())

    def test_restore_rejects_bad_schema(self):
        self._admin()
        r = self.client.post("/api/backup/restore/", {"articles": "nope"}, format="json")
        self.assertEqual(r.status_code, 400)


class SeedDataTests(TestCase):
    MODELS = (Article, Entree, Sortie, Ajustement, Mouvement, Inventaire)

    def _counts(self):
        return {m.__name__: m.objects.count() for m in self.MODELS}

    def test_seed_populates_all_modules(self):
        call_command("seed_data", stdout=StringIO())
        for model in self.MODELS:
            self.assertGreater(model.objects.count(), 0, f"{model.__name__} not seeded")
        self.assertGreater(AuditLog.objects.count(), 0)

    def test_seed_creates_cancelled_examples(self):
        call_command("seed_data", stdout=StringIO())
        self.assertTrue(Entree.objects.filter(statut="Annulé").exists())
        self.assertTrue(Sortie.objects.filter(statut="Annulé").exists())
        self.assertTrue(Ajustement.objects.filter(statut="Annulé").exists())

    def test_seed_inventaire_lines_are_consistent(self):
        call_command("seed_data", stdout=StringIO())
        inv = Inventaire.objects.first()
        self.assertTrue(inv.lines)
        self.assertEqual(inv.ecart_total, sum(ln["ecart"] for ln in inv.lines))
        for ln in inv.lines:
            self.assertEqual(ln["ecart"], ln["physique"] - ln["theorique"])

    def test_seed_is_idempotent(self):
        call_command("seed_data", stdout=StringIO())
        first = self._counts()
        call_command("seed_data", stdout=StringIO())
        self.assertEqual(self._counts(), first)

    def test_seed_reset_refreshes_data(self):
        call_command("seed_data", stdout=StringIO())
        call_command("seed_data", "--reset", stdout=StringIO())
        for model in self.MODELS:
            self.assertGreater(model.objects.count(), 0, f"{model.__name__} missing after reset")