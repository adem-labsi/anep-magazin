from django.apps import AppConfig


class StockConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "stock"

    def ready(self):
        from django.db.models.signals import post_migrate
        from django.dispatch import receiver

        @receiver(post_migrate)
        def seed_users(sender, **kwargs):
            if sender.name != "stock":
                return
            try:
                from django.contrib.auth import get_user_model
                from django.db import transaction
                User = get_user_model()
                if User.objects.exists():
                    return
                with transaction.atomic():
                    User.objects.create_user(username="admin", password="admin123", name="Administrateur Système", role="admin", is_staff=True, is_superuser=True)
                    User.objects.create_user(username="magasin", password="mag123", name="Magasinier Principal", role="magasinier")
                    User.objects.create_user(username="consult", password="cons123", name="Consultant Audit", role="consultant")
            except Exception:
                pass
