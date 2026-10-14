from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ...models import Article, Entree, Sortie, Ajustement, Mouvement, Inventaire, AuditLog
from ... import services
from datetime import date, timedelta
from decimal import Decimal
import random

User = get_user_model()

FOURNISSEURS = [
    "Maghreb Papeterie",
    "Peintures Atlas",
    "SignalPro",
    "ÉlectroDist",
    "BuroPlus",
    "TechImport",
    "Quincaillerie Centrale",
]

ATELIERS = ["Atelier Maintenance", "Atelier Menuiserie", "Atelier Peinture", "Chantier Nord", "Bureau Technique"]

MOTIFS_SORTIE = ["Consommation", "Réparation", "Installation chantier", "Remplacement", "Dotation équipe"]

# Articles left without réception so the Alertes/Dashboard modules show ruptures
# (indexes 10, 11) and a sous-seuil (index 3 keeps its initial == its seuil).
NO_ENTREE_INDEXES = {3, 10, 11}

ARTICLES = [
    ("Papier A4 Ramette", "Fournitures Bureau", "Ramette", 0, 10, "450.00", "Étagère A-1"),
    ("Peinture blanche 5L", "Peinture", "Bidon", 2, 5, "1800.00", "Étagère B-2"),
    ("Panneau PVC 3mm", "Signalétique", "Panneau", 0, 3, "2500.00", "Rayon C"),
    ("Scotch d'emballage", "Consommables", "Rouleau", 5, 5, "220.00", "Tiroir D"),
    ("Imprimante étiquettes", "Équipement", "Unité", 0, 1, "15000.00", "Bureau"),
    ("Câble électrique 2.5mm", "Électrique", "Mètre", 0, 50, "85.00", "Rack E-1"),
    ("Gants de protection", "Consommables", "Paire", 20, 10, "130.00", "Tiroir F"),
    ("Casque de chantier", "Outillage", "Unité", 6, 4, "950.00", "Rayon G"),
    ("Perceuse visseuse", "Outillage", "Unité", 0, 2, "6500.00", "Rayon G"),
    ("Disque dur externe 1To", "Équipement", "Unité", 0, 2, "8900.00", "Bureau"),
    ("Marqueur permanent", "Fournitures Bureau", "Unité", 0, 20, "60.00", "Tiroir D"),
    ("Panneau STOP", "Signalétique", "Panneau", 0, 2, "1900.00", "Rayon C"),
]


class Command(BaseCommand):
    help = "Seed the database with demo data for ANEP stock management."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing operational data (keeps users) before seeding.",
        )

    def handle(self, *args, **options):
        random.seed(20240101)

        if options.get("reset"):
            self._reset()

        self._users()
        articles = self._articles()
        self._entrees(articles)
        self._sorties(articles)
        self._ajustements(articles)
        self._inventaires(articles)
        services.log_audit(None, "Seed", "Jeu de données de démonstration généré")

        self.stdout.write(self.style.SUCCESS(
            "Seed data completed: "
            f"{Article.objects.count()} articles, "
            f"{Entree.objects.count()} entrées, "
            f"{Sortie.objects.count()} sorties, "
            f"{Ajustement.objects.count()} ajustements, "
            f"{Mouvement.objects.count()} mouvements, "
            f"{Inventaire.objects.count()} inventaires, "
            f"{AuditLog.objects.count()} logs d'audit."
        ))

    def _reset(self):
        for model in (Mouvement, Ajustement, Sortie, Entree, Inventaire, Article, AuditLog):
            model.objects.all().delete()
        self.stdout.write("Existing operational data cleared (users kept).")

    def _users(self):
        defaults = [
            ("admin", "admin123", "Administrateur Système", "admin", True),
            ("magasin", "mag123", "Magasinier Principal", "magasinier", False),
            ("consult", "cons123", "Consultant Audit", "consultant", False),
        ]
        for username, password, name, role, is_staff in defaults:
            if not User.objects.filter(username=username).exists():
                u = User.objects.create_user(username=username, password=password, name=name, role=role)
                u.is_staff = is_staff
                u.is_superuser = role == "admin"
                u.save(update_fields=["is_staff", "is_superuser"])
                self.stdout.write(f"Created user {username}")
            else:
                self.stdout.write(f"User {username} exists")

    def _articles(self):
        articles = []
        for des, cat, unite, init, seuil, prix, emp in ARTICLES:
            art, created = Article.objects.get_or_create(
                designation=des,
                defaults={
                    "code": services._next_ref(Article, "ART"),
                    "categorie": cat,
                    "unite": unite,
                    "initial": init,
                    "seuil": seuil,
                    "prix": Decimal(prix),
                    "emplacement": emp,
                },
            )
            if created:
                self.stdout.write(f"Created article {art.code} - {des}")
                if art.initial and art.initial > 0:
                    services.add_mouvement(
                        "Initial", art.code, art.code, art.designation, art.initial, art.prix, "Stock de départ"
                    )
            articles.append(art)
        return articles

    def _entrees(self, articles):
        if Entree.objects.count() > 0:
            self.stdout.write("Entrees exist")
            return
        created = []
        fac_n = 1000
        for i, art in enumerate(articles):
            if i in NO_ENTREE_INDEXES:
                continue
            for k in range(1 + (i % 3)):
                qte = random.randint(5, 40)
                fournisseur = FOURNISSEURS[(i + k) % len(FOURNISSEURS)]
                fac_n += 1
                ent = Entree.objects.create(
                    reference=services._next_ref(Entree, "ENT"),
                    date=date.today() - timedelta(days=random.randint(1, 45)),
                    code=art.code,
                    designation=art.designation,
                    qte=qte,
                    prix_unit=art.prix,
                    valeur=qte * art.prix,
                    fournisseur=fournisseur,
                    facture=f"FAC-{fac_n}",
                    bl=f"BL-{2000 + fac_n}",
                    statut="Validé",
                )
                services.add_mouvement(
                    "Entrée", ent.reference, art.code, art.designation, qte, art.prix, fournisseur
                )
                created.append(ent)
        if created:
            self._cancel(last=created[-1], kind="entree")
        self.stdout.write(f"Created {len(created)} entrees")

    def _sorties(self, articles):
        if Sortie.objects.count() > 0:
            self.stdout.write("Sorties exist")
            return
        created = []
        for i, art in enumerate(articles):
            if i % 2 == 1:
                continue
            for k in range(1 + (i % 2)):
                dispo = services.stock_dispo(art.code, art)
                if dispo <= 0:
                    break
                qte = min(random.randint(1, 8), dispo)
                atelier = ATELIERS[(i + k) % len(ATELIERS)]
                motif = MOTIFS_SORTIE[(i + k) % len(MOTIFS_SORTIE)]
                sor = Sortie.objects.create(
                    reference=services._next_ref(Sortie, "SOR"),
                    date=date.today() - timedelta(days=random.randint(1, 30)),
                    code=art.code,
                    designation=art.designation,
                    qte=qte,
                    prix_unit=art.prix,
                    valeur=qte * art.prix,
                    atelier=atelier,
                    motif=motif,
                    statut="Validé",
                )
                services.add_mouvement("Sortie", sor.reference, art.code, art.designation, qte, art.prix, atelier)
                created.append(sor)
        if created:
            self._cancel(last=created[-1], kind="sortie")
        self.stdout.write(f"Created {len(created)} sorties")

    def _ajustements(self, articles):
        if Ajustement.objects.count() > 0:
            self.stdout.write("Ajustements exist")
            return
        specs = [
            (0, -1, "Test casse", "JJ-001"),
            (1, 3, "Correction inventaire", "JJ-002"),
            (3, -2, "Périmé", ""),
            (6, 5, "Retour atelier", "JJ-003"),
            (7, -1, "Endommagé", "JJ-004"),
        ]
        created = []
        for idx, variation, motif, justificatif in specs:
            if idx >= len(articles):
                continue
            art = articles[idx]
            aj = Ajustement.objects.create(
                reference=services._next_ref(Ajustement, "AJU"),
                date=date.today() - timedelta(days=random.randint(0, 20)),
                code=art.code,
                designation=art.designation,
                variation=variation,
                prix_unit=art.prix,
                valeur=abs(variation) * art.prix,
                motif=motif,
                justificatif=justificatif,
                statut="Validé",
            )
            services.add_mouvement(
                "Ajustement", aj.reference, art.code, art.designation, variation, art.prix, "Régularisation"
            )
            created.append(aj)
        if created:
            self._cancel(last=created[-1], kind="ajustement")
        self.stdout.write(f"Created {len(created)} ajustements")

    def _inventaires(self, articles):
        if Inventaire.objects.count() > 0:
            self.stdout.write("Inventaires exist")
            return
        monthly_offsets = {}
        if len(articles) > 0:
            monthly_offsets[articles[0].code] = 2
        if len(articles) > 6:
            monthly_offsets[articles[6].code] = -1
        if len(articles) > 10:
            monthly_offsets[articles[10].code] = -3

        plans = [
            ("Mensuel", 30, monthly_offsets),
            ("Annuel", 0, {}),
        ]
        for typ, days, offsets in plans:
            lines, ecart_total, val_ecart = self._build_inventaire_lines(articles, offsets)
            Inventaire.objects.create(
                reference=services._next_ref(Inventaire, "INV"),
                date=date.today() - timedelta(days=days),
                type=typ,
                lines=lines,
                ecart_total=ecart_total,
                val_ecart=val_ecart,
                statut="Clôturé",
            )
        self.stdout.write(f"Created {len(plans)} inventaires")

    def _build_inventaire_lines(self, articles, offsets):
        lines = []
        ecart_total = 0
        val_ecart = Decimal("0")
        for art in articles:
            theo = services.stock_dispo(art.code, art)
            physique = max(0, theo + offsets.get(art.code, 0))
            ecart = physique - theo
            prix_unit = float(art.prix)
            valeur_ecart = ecart * prix_unit
            ecart_total += ecart
            val_ecart += Decimal(str(valeur_ecart))
            lines.append({
                "code": art.code,
                "designation": art.designation,
                "theorique": theo,
                "physique": physique,
                "ecart": ecart,
                "prixUnit": prix_unit,
                "valeurEcart": valeur_ecart,
            })
        return lines, ecart_total, val_ecart

    def _cancel(self, last, kind):
        if kind == "entree":
            last.statut = "Annulé"
            last.save(update_fields=["statut"])
            services.add_mouvement(
                "Annulation", last.reference, last.code, last.designation, -last.qte, last.prix_unit, "Annulation"
            )
        elif kind == "sortie":
            last.statut = "Annulé"
            last.save(update_fields=["statut"])
            services.add_mouvement(
                "Annulation", last.reference, last.code, last.designation, last.qte, last.prix_unit, "Annulation"
            )
        elif kind == "ajustement":
            last.statut = "Annulé"
            last.save(update_fields=["statut"])
            services.add_mouvement(
                "Annulation", last.reference, last.code, last.designation, -last.variation, last.prix_unit, "Annulation"
            )
