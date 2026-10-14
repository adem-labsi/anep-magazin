# ANEP Magasin — Makefile. Fonctionne avec podman-compose, docker compose ou podman compose.
# Le moteur est détecté automatiquement (préférence : podman-compose > docker compose > podman compose).

COMPOSE ?= $(shell \
	if command -v podman-compose >/dev/null 2>&1; then echo podman-compose; \
	elif command -v docker >/dev/null 2>&1; then echo "docker compose"; \
	elif command -v podman >/dev/null 2>&1; then echo "podman compose"; \
	else echo "none"; fi)

$(if $(filter none,$(COMPOSE)),$(error Aucun moteur compose trouvé (docker/podman). Installez podman-compose ou docker.),)

.PHONY: build dev deploy down logs ps test seed

build:
	$(COMPOSE) -f docker-compose.yml build
	$(COMPOSE) -f docker-compose.deploy.yml build

dev:
	$(COMPOSE) -f docker-compose.yml up -d

deploy:
	$(COMPOSE) -f docker-compose.deploy.yml up -d --build

down:
	$(COMPOSE) -f docker-compose.yml down || true
	$(COMPOSE) -f docker-compose.deploy.yml down || true

logs:
	$(COMPOSE) -f docker-compose.yml logs -f

ps:
	$(COMPOSE) -f docker-compose.yml ps || true
	$(COMPOSE) -f docker-compose.deploy.yml ps || true

test:
	cd backend && { [ -d .venv ] && .venv/bin/python manage.py test -v 2 || python manage.py test -v 2; } 2>&1 | tee test.log
	cd frontend && npm test 2>&1 | tee test.log

seed:
	$(COMPOSE) -f docker-compose.yml exec backend python manage.py seed_data --reset