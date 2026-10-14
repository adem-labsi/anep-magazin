#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if command -v podman-compose >/dev/null 2>&1; then
  COMPOSE="podman-compose"
elif command -v docker >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v podman >/dev/null 2>&1; then
  COMPOSE="podman compose"
else
  echo "Erreur : aucun moteur compose trouvé (docker ou podman). Installez podman-compose ou docker." >&2
  exit 1
fi

echo "Construction avec : $COMPOSE"
$COMPOSE -f docker-compose.yml build
$COMPOSE -f docker-compose.deploy.yml build

echo "Build terminé. Démarrage :"
echo "  make dev     # développement (sources montées, rechargement auto)"
echo "  make deploy  # production (images compilées)"