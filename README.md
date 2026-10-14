# ANEP Magasin — Migré (Next.js + Django + PostgreSQL)

Portage de `magasin.html` vers Next.js (frontend) + Django REST (backend) + PostgreSQL.
Compatible **Podman** (podman-compose / podman compose) et **Docker** (docker compose).

## Structure

- `backend/` — API Django REST (PostgreSQL, DRF)
- `frontend/` — application Next.js 14 (App Router)
- `docker-compose.yml` — environnement de développement (sources montées)
- `docker-compose.deploy.yml` — environnement de production (images compilées, gunicorn)

## Comptes par défaut

| Rôle        | Login    | Mot de passe |
|-------------|----------|--------------|
| Admin       | admin    | admin123     |
| Magasinier  | magasin  | mag123       |
| Consultant  | consult  | cons123      |

(Comptes créés automatiquement par `manage.py seed_data` ou le signal `post_migrate`.)

## Lancer en local (sans Docker)

Backend (Python ≥ 3.10) :
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver 8000
```

Frontend (Node ≥ 18) :
```bash
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:3000 (API http://127.0.0.1:8000/api). En mode Docker,
tout passe par nginx sur http://localhost:8080 et l’API est appelée en relatif
(`/api`), proxifiée par Next vers `http://127.0.0.1:8000` (voir `next.config.mjs`,
surchargeable via `API_PROXY_TARGET`).

## Lancer avec Podman/Docker — dev

```bash
make build     # ou ./build-docker.sh / build-docker.bat
make dev       # podman-compose -f docker-compose.yml up -d
make logs
```

- Frontend + API : http://localhost:8080 (via nginx)
- Backend direct : non exposé
- PostgreSQL : non exposé

nginx sert de point d’entrée unique : `/api/` est proxifié vers `backend:8000`,
le reste vers `frontend:3000` (config `nginx/nginx.conf`, port hôte `8080`).

Le compose de dev monte les sources (`./backend`, `./frontend`) dans les conteneurs :
les modifications sont prises en compte avec rechargement automatique (runserver + next dev).

## Lancer avec Podman/Docker — deployment

```bash
make deploy    # podman-compose -f docker-compose.deploy.yml up -d --build
```

Variables d’environnement optionnelles (fichier `.env` à la racine) :
- `DJANGO_SECRET_KEY` — clé secrète (obsolète utilisé sinon)
- `POSTGRES_PASSWORD` — mot de passe PostgreSQL (défaut `anep`)
- `DJANGO_ALLOWED_HOSTS` — hôtes autorisés (défaut `*`)
- `NEXT_PUBLIC_API_URL` — URL publique de l’API (défaut `/api`, relatif, servi par nginx)

En production, backend tourne avec `gunicorn` (3 workers) et `DJANGO_DEBUG=0`,
et nginx expose l’ensemble sur le port `8080`.

## Tests

```bash
make test
```

- Backend : `backend/.venv/bin/python manage.py test -v 2` (40 tests) → `backend/test.log`
- Frontend : `npm test` (Vitest + Testing Library, 43 tests) → `frontend/test.log`

## Données de démonstration

`make dev` lance automatiquement `seed_data` (idempotent) au démarrage du backend.
Pour rafraîchir le jeu complet (articles, entrées, sorties, ajustements, mouvements,
inventaires, audit — utilisateurs conservés) :

```bash
make seed      # équivaut à seed_data --reset dans le conteneur backend
```

## Vérification

```bash
make ps
podman compose ps
podman compose logs -f backend
podman compose -f docker-compose.deploy.yml logs -f backend
```