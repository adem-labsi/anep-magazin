from decimal import Decimal
from .models import Article, Entree, Sortie, Ajustement, Mouvement, AuditLog


def _next_ref(model, prefix):
    last = model.objects.order_by("-id").first()
    num = (last.id if last else 0) + 1
    return f"{prefix}-{str(num).zfill(6)}"


def get_article(code):
    try:
        return Article.objects.get(code=code)
    except Article.DoesNotExist:
        return None


def stock_totals(code):
    ent = sum(e.qte for e in Entree.objects.filter(code=code).exclude(statut="Annulé"))
    sor = sum(s.qte for s in Sortie.objects.filter(code=code).exclude(statut="Annulé"))
    aju = sum(a.variation for a in Ajustement.objects.filter(code=code).exclude(statut="Annulé"))
    return ent, sor, aju


def stock_dispo(code, article=None):
    art = article or get_article(code)
    if not art:
        return 0
    ent, sor, aju = stock_totals(code)
    return art.initial + ent - sor + aju


def add_mouvement(type_, ref, code, designation, qte, prix_unit, tiers):
    Mouvement.objects.create(
        type=type_,
        ref=ref,
        code=code,
        designation=designation,
        qte=qte,
        prix_unit=prix_unit,
        valeur=abs(qte) * Decimal(str(prix_unit)),
        tiers=tiers or "",
    )


def log_audit(user, action, details):
    if user:
        name = getattr(user, "name", None) or getattr(user, "username", None)
    else:
        name = None
    AuditLog.objects.create(
        action=action,
        details=details,
        user=name or "Système",
    )
