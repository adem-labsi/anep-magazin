from decimal import Decimal, InvalidOperation
from django.db import transaction
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token

from .models import User, Article, Entree, Sortie, Ajustement, Mouvement, Inventaire, AuditLog
from .serializers import (
    UserSerializer, RegisterUserSerializer, UserUpdateSerializer, ArticleSerializer,
    EntreeSerializer, SortieSerializer, AjustementSerializer, MouvementSerializer,
    InventaireSerializer, AuditLogSerializer,
)
from . import services
from .permissions import CanWrite, CanDelete, CanManageUsers


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip().lower()
        password = request.data.get("password") or ""
        if not username or not password:
            return Response({"detail": "Identifiants requis"}, status=400)
        user = authenticate(username=username, password=password)
        if not user:
            # try case-insensitive username match
            try:
                tmp = User.objects.get(username__iexact=username)
                user = authenticate(username=tmp.username, password=password)
            except User.DoesNotExist:
                user = None
        if not user:
            return Response({"detail": "Identifiants incorrects"}, status=401)
        token, _ = Token.objects.get_or_create(user=user)
        from django.utils import timezone
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        services.log_audit(user, "Connexion", f"Utilisateur {user.name or user.username} ({user.role}) connecté")
        return Response({
            "token": token.key,
            "user": UserSerializer(user).data,
        })


class LogoutView(APIView):
    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        services.log_audit(request.user, "Déconnexion", f"Utilisateur {request.user.name or request.user.username} déconnecté")
        return Response({"detail": "ok"})


class PreferencesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"theme": request.user.theme, "lang": request.user.lang})

    def patch(self, request):
        theme = request.data.get("theme")
        lang = request.data.get("lang")
        if theme is not None and theme not in ("light", "dark"):
            return Response({"detail": "Thème invalide"}, status=400)
        if lang is not None and lang not in ("fr", "ar"):
            return Response({"detail": "Langue invalide"}, status=400)
        fields = []
        if theme is not None:
            request.user.theme = theme
            fields.append("theme")
        if lang is not None:
            request.user.lang = lang
            fields.append("lang")
        if fields:
            request.user.save(update_fields=fields)
        return Response({"theme": request.user.theme, "lang": request.user.lang})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]

    def get_serializer_class(self):
        if self.action == "create":
            return RegisterUserSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        services.log_audit(self.request.user, "Création utilisateur", user.username)

    def perform_update(self, serializer):
        user = serializer.save()
        services.log_audit(self.request.user, "Modification utilisateur", user.username)

    def perform_destroy(self, instance):
        if instance.username == "admin":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Impossible de supprimer admin")
        name = instance.username
        instance.delete()
        services.log_audit(self.request.user, "Suppression utilisateur", name)


class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticated, CanWrite]

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), CanDelete()]
        return [permissions.IsAuthenticated(), CanWrite()]

    def perform_create(self, serializer):
        from .models import Article
        code = services._next_ref(Article, "ART")
        art = serializer.save(code=code)
        services.log_audit(self.request.user, "Création article", f"{art.code} - {art.designation} - Prix: {art.prix}")
        initial = art.initial
        if initial and initial > 0:
            services.add_mouvement("Initial", art.code, art.code, art.designation, initial, art.prix, "Stock de départ")

    def perform_update(self, serializer):
        art = serializer.save()
        services.log_audit(self.request.user, "Modification article", f"{art.code} - {art.designation}")


class EntreeViewSet(viewsets.ModelViewSet):
    queryset = Entree.objects.all()
    serializer_class = EntreeSerializer
    permission_classes = [permissions.IsAuthenticated, CanWrite]

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), CanDelete()]
        return [permissions.IsAuthenticated(), CanWrite()]

    def create(self, request, *args, **kwargs):
        data = request.data
        code = data.get("code")
        art = services.get_article(code)
        if not art:
            return Response({"detail": "Article introuvable"}, status=400)
        try:
            qte = int(data.get("qte"))
        except (TypeError, ValueError):
            return Response({"detail": "Quantité invalide"}, status=400)
        if qte <= 0:
            return Response({"detail": "Quantité invalide"}, status=400)
        fournisseur = (data.get("fournisseur") or "").strip()
        if not fournisseur:
            return Response({"detail": "Fournisseur requis"}, status=400)
        pri_input = data.get("prix_unit", data.get("prixAchat"))
        if pri_input not in (None, ""):
            try:
                pri_achat = Decimal(str(pri_input))
            except (InvalidOperation, TypeError, ValueError):
                return Response({"detail": "Prix invalide"}, status=400)
            if pri_achat != art.prix:
                art.prix = pri_achat
                art.save(update_fields=["prix"])
                services.log_audit(request.user, "Mise à jour prix", f"{code} - {pri_achat}")
        else:
            pri_achat = art.prix
        date = data.get("date") or None
        import datetime
        if not date:
            date = datetime.date.today().isoformat()
        fac = (data.get("facture") or "").strip()
        force = str(data.get("force_facture", "")).lower() in ("1", "true", "yes", "on")
        if fac and not force and Entree.objects.filter(facture=fac).exclude(statut="Annulé").exists():
            return Response(
                {"detail": "Facture déjà utilisée", "code": "facture_dupliquee"},
                status=400,
            )
        ent = Entree.objects.create(
            reference=services._next_ref(Entree, "ENT"),
            date=date,
            code=code,
            designation=art.designation,
            qte=qte,
            prix_unit=pri_achat,
            valeur=qte * pri_achat,
            fournisseur=fournisseur,
            facture=fac,
            bl=(data.get("bl") or "").strip(),
            statut="Validé",
        )
        services.add_mouvement("Entrée", ent.reference, code, art.designation, qte, ent.prix_unit, fournisseur)
        services.log_audit(request.user, "Réception", f"{ent.reference} - {code} x{qte}")
        return Response(EntreeSerializer(ent).data, status=201)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        if "code" in data:
            instance.code = data["code"]
            art = services.get_article(instance.code)
            if art:
                instance.designation = art.designation
        if "qte" in data:
            try:
                instance.qte = int(data["qte"])
            except (TypeError, ValueError):
                pass
        if "prix_unit" in data:
            try:
                instance.prix_unit = Decimal(str(data["prix_unit"]))
            except (InvalidOperation, TypeError, ValueError):
                return Response({"detail": "Prix invalide"}, status=400)
        try:
            instance.valeur = Decimal(instance.qte) * Decimal(str(instance.prix_unit))
        except (InvalidOperation, TypeError, ValueError):
            pass
        if "date" in data:
            instance.date = data["date"]
        if "fournisseur" in data:
            instance.fournisseur = data["fournisseur"]
        if "facture" in data:
            instance.facture = data["facture"]
        if "bl" in data:
            instance.bl = data["bl"]
        instance.save()
        services.log_audit(request.user, "Modification entrée", instance.reference)
        return Response(EntreeSerializer(instance).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        if getattr(request.user, "role", None) != "admin":
            return Response({"detail": "Admin uniquement"}, status=403)
        instance = self.get_object()
        if instance.statut == "Annulé":
            return Response({"detail": "déjà annulé"}, status=400)
        instance.statut = "Annulé"
        instance.save(update_fields=["statut"])
        op_qte = instance.qte
        services.add_mouvement("Annulation", instance.reference, instance.code, instance.designation, -op_qte, instance.prix_unit, "Annulation")
        services.log_audit(request.user, "Annulation", f"entrees {instance.reference}")
        return Response(EntreeSerializer(instance).data)


class SortieViewSet(viewsets.ModelViewSet):
    queryset = Sortie.objects.all()
    serializer_class = SortieSerializer
    permission_classes = [permissions.IsAuthenticated, CanWrite]

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), CanDelete()]
        return [permissions.IsAuthenticated(), CanWrite()]

    def create(self, request, *args, **kwargs):
        data = request.data
        code = data.get("code")
        art = services.get_article(code)
        if not art:
            return Response({"detail": "Article introuvable"}, status=400)
        try:
            qte = int(data.get("qte"))
        except (TypeError, ValueError):
            return Response({"detail": "Quantité invalide"}, status=400)
        if qte <= 0:
            return Response({"detail": "Quantité invalide"}, status=400)
        atelier = (data.get("atelier") or "").strip()
        motif = (data.get("motif") or "").strip()
        if not atelier or not motif:
            return Response({"detail": "Atelier et motif requis"}, status=400)
        dispo = services.stock_dispo(code, art)
        if qte > dispo:
            services.log_audit(request.user, "Tentative sortie bloquée", f"{code} x{qte}")
            return Response({"detail": f"BLOCAGE : Stock dispo = {dispo}, demandé = {qte}"}, status=400)
        import datetime
        date = data.get("date") or datetime.date.today().isoformat()
        sor = Sortie.objects.create(
            reference=services._next_ref(Sortie, "SOR"),
            date=date,
            code=code,
            designation=art.designation,
            qte=qte,
            prix_unit=art.prix,
            valeur=qte * art.prix,
            atelier=atelier,
            motif=motif,
            statut="Validé",
        )
        services.add_mouvement("Sortie", sor.reference, code, art.designation, qte, art.prix, atelier)
        services.log_audit(request.user, "Sortie", f"{sor.reference} - {code} x{qte} → {atelier}")
        return Response(SortieSerializer(sor).data, status=201)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        if "code" in data:
            instance.code = data["code"]
            art = services.get_article(instance.code)
            if art:
                instance.designation = art.designation
        if "qte" in data:
            try:
                instance.qte = int(data["qte"])
            except (TypeError, ValueError):
                pass
        if "atelier" in data:
            instance.atelier = data["atelier"]
        if "motif" in data:
            instance.motif = data["motif"]
        if "date" in data:
            instance.date = data["date"]
        art = services.get_article(instance.code)
        if art:
            instance.prix_unit = art.prix
            instance.valeur = instance.qte * art.prix
        instance.save()
        services.log_audit(request.user, "Modification sortie", instance.reference)
        return Response(SortieSerializer(instance).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        if getattr(request.user, "role", None) != "admin":
            return Response({"detail": "Admin uniquement"}, status=403)
        instance = self.get_object()
        if instance.statut == "Annulé":
            return Response({"detail": "déjà annulé"}, status=400)
        instance.statut = "Annulé"
        instance.save(update_fields=["statut"])
        services.add_mouvement("Annulation", instance.reference, instance.code, instance.designation, instance.qte, instance.prix_unit, "Annulation")
        services.log_audit(request.user, "Annulation", f"sorties {instance.reference}")
        return Response(SortieSerializer(instance).data)


class AjustementViewSet(viewsets.ModelViewSet):
    queryset = Ajustement.objects.all()
    serializer_class = AjustementSerializer
    permission_classes = [permissions.IsAuthenticated, CanWrite]

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), CanDelete()]
        return [permissions.IsAuthenticated(), CanWrite()]

    def create(self, request, *args, **kwargs):
        data = request.data
        code = data.get("code")
        art = services.get_article(code)
        if not art:
            return Response({"detail": "Article introuvable"}, status=400)
        try:
            variation = int(data.get("variation"))
        except (TypeError, ValueError):
            return Response({"detail": "Variation invalide"}, status=400)
        if variation == 0:
            return Response({"detail": "Variation ne peut être 0"}, status=400)
        motif = (data.get("motif") or "").strip()
        if not motif:
            return Response({"detail": "Motif requis"}, status=400)
        import datetime
        date = data.get("date") or datetime.date.today().isoformat()
        aj = Ajustement.objects.create(
            reference=services._next_ref(Ajustement, "AJU"),
            date=date,
            code=code,
            designation=art.designation,
            variation=variation,
            prix_unit=art.prix,
            valeur=abs(variation) * art.prix,
            motif=motif,
            justificatif=(data.get("justificatif") or "").strip(),
            statut="Validé",
        )
        services.add_mouvement("Ajustement", aj.reference, code, art.designation, variation, art.prix, "Régularisation")
        services.log_audit(request.user, "Ajustement", f"{aj.reference} - {code} {variation}")
        return Response(AjustementSerializer(aj).data, status=201)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        if "code" in data:
            instance.code = data["code"]
            art = services.get_article(instance.code)
            if art:
                instance.designation = art.designation
        if "variation" in data:
            try:
                instance.variation = int(data["variation"])
            except (TypeError, ValueError):
                pass
        if "motif" in data:
            instance.motif = data["motif"]
        if "justificatif" in data:
            instance.justificatif = data["justificatif"]
        if "date" in data:
            instance.date = data["date"]
        art = services.get_article(instance.code)
        if art:
            instance.prix_unit = art.prix
            instance.valeur = abs(instance.variation) * art.prix
        instance.save()
        services.log_audit(request.user, "Modification ajustement", instance.reference)
        return Response(AjustementSerializer(instance).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        if getattr(request.user, "role", None) != "admin":
            return Response({"detail": "Admin uniquement"}, status=403)
        instance = self.get_object()
        if instance.statut == "Annulé":
            return Response({"detail": "déjà annulé"}, status=400)
        instance.statut = "Annulé"
        instance.save(update_fields=["statut"])
        services.add_mouvement("Annulation", instance.reference, instance.code, instance.designation, -instance.variation, instance.prix_unit, "Annulation")
        services.log_audit(request.user, "Annulation", f"ajustements {instance.reference}")
        return Response(AjustementSerializer(instance).data)


class MouvementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Mouvement.objects.all()
    serializer_class = MouvementSerializer
    permission_classes = [permissions.IsAuthenticated]


class InventaireViewSet(viewsets.ModelViewSet):
    queryset = Inventaire.objects.all()
    serializer_class = InventaireSerializer
    permission_classes = [permissions.IsAuthenticated, CanWrite]

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), CanWrite()]

    def create(self, request, *args, **kwargs):
        data = request.data
        import datetime
        date = data.get("date") or datetime.date.today().isoformat()
        typ = data.get("type") or "Mensuel"
        raw_lines = data.get("lines") or []
        if isinstance(raw_lines, str):
            import json
            try:
                raw_lines = json.loads(raw_lines)
            except Exception:
                raw_lines = []
        computed = []
        ecart_total = 0
        val_ecart = 0
        for ln in raw_lines:
            code = ln.get("code")
            art = services.get_article(code)
            if not art:
                continue
            try:
                phys = int(ln.get("physique", ln.get("phys", 0)))
            except (TypeError, ValueError):
                phys = 0
            theo = services.stock_dispo(code, art)
            ecart = phys - theo
            ecart_total += ecart
            val = ecart * float(art.prix)
            val_ecart += val
            computed.append({
                "code": code,
                "designation": art.designation,
                "theorique": theo,
                "physique": phys,
                "ecart": ecart,
                "prixUnit": float(art.prix),
                "valeurEcart": val,
            })
        inv = Inventaire.objects.create(
            reference=services._next_ref(Inventaire, "INV"),
            date=date,
            type=typ,
            lines=computed,
            ecart_total=ecart_total,
            val_ecart=val_ecart,
            statut="Clôturé",
        )
        services.log_audit(request.user, "Inventaire", f"{inv.reference} - {typ}")
        return Response(InventaireSerializer(inv).data, status=201)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]


class BackupView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]

    def get(self, request):
        return Response(_dump_backup())


class BackupRestoreView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]

    def post(self, request):
        data = request.data
        required = ["articles", "entrees", "sorties", "ajustements", "mouvements", "inventaires", "audit"]
        if not isinstance(data, dict) or any(not isinstance(data.get(k), list) for k in required):
            return Response({"detail": "Fichier invalide ou structure incompatible"}, status=400)
        try:
            with transaction.atomic():
                _restore_backup(data)
        except (TypeError, ValueError, InvalidOperation) as exc:
            return Response({"detail": f"Restauration impossible : {exc}"}, status=400)
        services.log_audit(request.user, "Restauration", "Import JSON")
        return Response({"detail": "Restauration réussie", "backup": _dump_backup()})


class BackupResetView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]

    def post(self, request):
        with transaction.atomic():
            for model in (Mouvement, Ajustement, Sortie, Entree, Inventaire, Article):
                model.objects.all().delete()
            AuditLog.objects.all().delete()
        services.log_audit(request.user, "Réinitialisation", "Toutes les données ont été effacées")
        return Response({"detail": "Données réinitialisées"})


def _dump_backup():
    from django.utils import timezone
    return {
        "version": 1,
        "exportedAt": timezone.now().isoformat(),
        "articles": ArticleSerializer(Article.objects.all(), many=True).data,
        "entrees": EntreeSerializer(Entree.objects.all(), many=True).data,
        "sorties": SortieSerializer(Sortie.objects.all(), many=True).data,
        "ajustements": AjustementSerializer(Ajustement.objects.all(), many=True).data,
        "mouvements": MouvementSerializer(Mouvement.objects.all(), many=True).data,
        "inventaires": InventaireSerializer(Inventaire.objects.all(), many=True).data,
        "audit": AuditLogSerializer(AuditLog.objects.all(), many=True).data,
    }


def _restore_backup(data):
    fields = {
        Article: ["code", "designation", "categorie", "unite", "initial", "seuil", "prix", "emplacement"],
        Entree: ["reference", "date", "code", "designation", "qte", "prix_unit", "valeur", "fournisseur", "facture", "bl", "statut"],
        Sortie: ["reference", "date", "code", "designation", "qte", "prix_unit", "valeur", "atelier", "motif", "statut"],
        Ajustement: ["reference", "date", "code", "designation", "variation", "prix_unit", "valeur", "motif", "justificatif", "statut"],
        Mouvement: ["type", "ref", "code", "designation", "qte", "prix_unit", "valeur", "tiers"],
        Inventaire: ["reference", "date", "type", "lines", "ecart_total", "val_ecart", "statut"],
        AuditLog: ["action", "details", "user"],
    }
    key_by_model = {
        Article: "articles", Entree: "entrees", Sortie: "sorties", Ajustement: "ajustements",
        Mouvement: "mouvements", Inventaire: "inventaires", AuditLog: "audit",
    }
    for model in (Mouvement, Ajustement, Sortie, Entree, Inventaire, Article, AuditLog):
        model.objects.all().delete()
        for row in data[key_by_model[model]]:
            clean = {f: row[f] for f in fields[model] if f in row}
            model.objects.create(**clean)


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        articles = Article.objects.all()
        total = articles.count()
        rupt = 0
        sous = 0
        valeur = 0
        for a in articles:
            s = services.stock_dispo(a.code, a)
            if s <= 0:
                rupt += 1
            elif s <= a.seuil:
                sous += 1
            valeur += s * float(a.prix)
        import datetime
        mvt_today = Mouvement.objects.filter(date__date=datetime.date.today())
        mvt_count = mvt_today.count()
        mvt_val = sum(float(m.valeur) for m in mvt_today)
        health = (round(((total - rupt - sous) / total) * 100) if total else 100)
        last = Mouvement.objects.order_by("-date").first()
        top = []
        maxv = max(1, total)
        bars = [
            {"label": "Disponibles", "value": total - rupt - sous, "color": "#25c58a"},
            {"label": "Sous seuil", "value": sous, "color": "#ffb547"},
            {"label": "Ruptures", "value": rupt, "color": "#f45c66"},
        ]
        insight = (
            f"{rupt} article(s) en rupture." if rupt else
            (f"{sous} article(s) sous seuil." if sous else "Stock sous contrôle.")
        )
        dash_articles = []
        for a in articles.order_by("code")[:15]:
            s = services.stock_dispo(a.code, a)
            st = "Rupture" if s <= 0 else ("Sous seuil" if s <= a.seuil else "OK")
            dash_articles.append({
                "code": a.code,
                "designation": a.designation,
                "categorie": a.categorie,
                "stock": s,
                "seuil": a.seuil,
                "prix": float(a.prix),
                "valeur": s * float(a.prix),
                "statut": st,
            })
        return Response({
            "totalArticles": total,
            "sousSeuil": sous,
            "ruptures": rupt,
            "valeurStock": valeur,
            "mouvementsJour": mvt_count,
            "valeurMouvementsJour": mvt_val,
            "health": health,
            "lastOperation": last.type if last else "Aucune",
            "bars": bars,
            "insight": insight,
            "articles": dash_articles,
            "max": maxv,
            "heroLastOp": last.type if last else "Aucune",
        })


class AlertesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rupt = []
        sous = []
        for a in Article.objects.all():
            s = services.stock_dispo(a.code, a)
            if s <= 0:
                rupt.append((a, s))
            elif s > 0 and s <= a.seuil:
                sous.append((a, s))
        rows = []
        for a, s in rupt + sous:
            rows.append({
                "code": a.code,
                "designation": a.designation,
                "stock": s,
                "seuil": a.seuil,
                "prix": float(a.prix),
                "manque": max(0, a.seuil - s),
                "valeurManquante": max(0, a.seuil - s) * float(a.prix),
                "type": "RUPTURE" if s <= 0 else "SOUS SEUIL",
            })
        val_rupt = sum(a.seuil * float(a.prix) for a, s in rupt)
        return Response({
            "ruptures": len(rupt),
            "sousSeuil": len(sous),
            "ok": Article.objects.count() - len(rupt) - len(sous),
            "valeurReappro": val_rupt,
            "rows": rows,
        })
