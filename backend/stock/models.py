from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_ADMIN = "admin"
    ROLE_MAGASINIER = "magasinier"
    ROLE_CONSULTANT = "consultant"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Administrateur"),
        (ROLE_MAGASINIER, "Magasinier"),
        (ROLE_CONSULTANT, "Consultant"),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_CONSULTANT)
    name = models.CharField(max_length=150, blank=True)
    theme = models.CharField(max_length=10, default="light")
    lang = models.CharField(max_length=5, default="fr")

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.get_full_name() or self.username
        super().save(*args, **kwargs)

    @property
    def full_name_display(self):
        return self.name or self.username


class Article(models.Model):
    code = models.CharField(max_length=20, unique=True, editable=False)
    designation = models.CharField(max_length=255)
    categorie = models.CharField(max_length=80)
    unite = models.CharField(max_length=40, default="Unité")
    initial = models.IntegerField(default=0)
    seuil = models.IntegerField(default=5)
    prix = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    emplacement = models.CharField(max_length=120, default="-")
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return self.code


class Entree(models.Model):
    reference = models.CharField(max_length=20, unique=True, editable=False)
    date = models.DateField()
    code = models.CharField(max_length=20)  # article code
    designation = models.CharField(max_length=255)
    qte = models.IntegerField()
    prix_unit = models.DecimalField(max_digits=18, decimal_places=2)
    valeur = models.DecimalField(max_digits=18, decimal_places=2)
    fournisseur = models.CharField(max_length=255)
    facture = models.CharField(max_length=120, blank=True)
    bl = models.CharField(max_length=120, blank=True)
    statut = models.CharField(max_length=20, default="Validé")

    class Meta:
        ordering = ["-date"]


class Sortie(models.Model):
    reference = models.CharField(max_length=20, unique=True, editable=False)
    date = models.DateField()
    code = models.CharField(max_length=20)
    designation = models.CharField(max_length=255)
    qte = models.IntegerField()
    prix_unit = models.DecimalField(max_digits=18, decimal_places=2)
    valeur = models.DecimalField(max_digits=18, decimal_places=2)
    atelier = models.CharField(max_length=255)
    motif = models.CharField(max_length=255)
    statut = models.CharField(max_length=20, default="Validé")

    class Meta:
        ordering = ["-date"]


class Ajustement(models.Model):
    reference = models.CharField(max_length=20, unique=True, editable=False)
    date = models.DateField()
    code = models.CharField(max_length=20)
    designation = models.CharField(max_length=255)
    variation = models.IntegerField()
    prix_unit = models.DecimalField(max_digits=18, decimal_places=2)
    valeur = models.DecimalField(max_digits=18, decimal_places=2)
    motif = models.CharField(max_length=255)
    justificatif = models.CharField(max_length=255, blank=True)
    statut = models.CharField(max_length=20, default="Validé")

    class Meta:
        ordering = ["-date"]


class Mouvement(models.Model):
    date = models.DateTimeField(auto_now_add=True)
    type = models.CharField(max_length=30)
    ref = models.CharField(max_length=40)
    code = models.CharField(max_length=20)
    designation = models.CharField(max_length=255)
    qte = models.IntegerField()
    prix_unit = models.DecimalField(max_digits=18, decimal_places=2)
    valeur = models.DecimalField(max_digits=18, decimal_places=2)
    tiers = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-date"]


class Inventaire(models.Model):
    reference = models.CharField(max_length=20, unique=True, editable=False)
    date = models.DateField()
    type = models.CharField(max_length=20, default="Mensuel")
    lines = models.JSONField(default=list)
    ecart_total = models.IntegerField(default=0)
    val_ecart = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    statut = models.CharField(max_length=20, default="Clôturé")

    class Meta:
        ordering = ["-date"]


class AuditLog(models.Model):
    date = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=80)
    details = models.TextField()
    user = models.CharField(max_length=150)

    class Meta:
        ordering = ["-date"]
