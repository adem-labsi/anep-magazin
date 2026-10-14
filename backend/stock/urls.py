from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, ArticleViewSet, EntreeViewSet, SortieViewSet, AjustementViewSet,
    MouvementViewSet, InventaireViewSet, AuditLogViewSet, DashboardView, AlertesView,
    LoginView, LogoutView, PreferencesView, BackupView, BackupRestoreView, BackupResetView,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("articles", ArticleViewSet, basename="article")
router.register("entrees", EntreeViewSet, basename="entree")
router.register("sorties", SortieViewSet, basename="sortie")
router.register("ajustements", AjustementViewSet, basename="ajustement")
router.register("mouvements", MouvementViewSet, basename="mouvement")
router.register("inventaires", InventaireViewSet, basename="inventaire")
router.register("audit", AuditLogViewSet, basename="audit")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("preferences/", PreferencesView.as_view(), name="preferences"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("alertes/", AlertesView.as_view(), name="alertes"),
    path("backup/", BackupView.as_view(), name="backup"),
    path("backup/restore/", BackupRestoreView.as_view(), name="backup-restore"),
    path("backup/reset/", BackupResetView.as_view(), name="backup-reset"),
    path("", include(router.urls)),
]
