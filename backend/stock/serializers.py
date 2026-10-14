from rest_framework import serializers
from decimal import Decimal
from .models import User, Article, Entree, Sortie, Ajustement, Mouvement, Inventaire, AuditLog
from . import services


class UserSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "name", "role", "label", "theme", "lang", "last_login"]
        read_only_fields = ["id", "theme", "lang", "last_login"]

    def get_label(self, obj):
        return f"{obj.role} - {obj.name or obj.username}"


class RegisterUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "name", "password", "role"]

    def create(self, validated_data):
        pwd = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(pwd)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["id", "username", "name", "role", "password"]
        read_only_fields = ["id"]

    def update(self, instance, validated_data):
        password = validated_data.pop("password", "")
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ArticleSerializer(serializers.ModelSerializer):
    stock_dispo = serializers.SerializerMethodField()
    total_entrees = serializers.SerializerMethodField()
    total_sorties = serializers.SerializerMethodField()
    total_ajust = serializers.SerializerMethodField()
    statut = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            "id", "code", "designation", "categorie", "unite", "initial", "seuil",
            "prix", "emplacement", "date_creation",
            "stock_dispo", "total_entrees", "total_sorties", "total_ajust", "statut",
        ]
        read_only_fields = ["id", "code", "date_creation", "stock_dispo", "total_entrees",
                            "total_sorties", "total_ajust", "statut"]

    def get_stock_dispo(self, obj):
        return services.stock_dispo(obj.code, obj)

    def get_total_entrees(self, obj):
        return services.stock_totals(obj.code)[0]

    def get_total_sorties(self, obj):
        return services.stock_totals(obj.code)[1]

    def get_total_ajust(self, obj):
        return services.stock_totals(obj.code)[2]

    def get_statut(self, obj):
        s = services.stock_dispo(obj.code, obj)
        if s <= 0:
            return "Rupture"
        if s <= obj.seuil:
            return "Sous seuil"
        return "OK"


class EntreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entree
        fields = ["id", "reference", "date", "code", "designation", "qte", "prix_unit",
                  "valeur", "fournisseur", "facture", "bl", "statut"]
        read_only_fields = ["id", "reference", "designation", "valeur", "statut"]


class SortieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sortie
        fields = ["id", "reference", "date", "code", "designation", "qte", "prix_unit",
                  "valeur", "atelier", "motif", "statut"]
        read_only_fields = ["id", "reference", "designation", "prix_unit", "valeur", "statut"]


class AjustementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ajustement
        fields = ["id", "reference", "date", "code", "designation", "variation", "prix_unit",
                  "valeur", "motif", "justificatif", "statut"]
        read_only_fields = ["id", "reference", "designation", "prix_unit", "valeur", "statut"]


class MouvementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mouvement
        fields = ["id", "date", "type", "ref", "code", "designation", "qte", "prix_unit",
                  "valeur", "tiers"]


class InventaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventaire
        fields = ["id", "reference", "date", "type", "lines", "ecart_total", "val_ecart", "statut"]


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "date", "action", "details", "user"]
