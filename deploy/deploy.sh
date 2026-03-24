#!/usr/bin/env bash
set -euo pipefail

BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [[ ! -f ".env.production" ]]; then
  echo "Arquivo .env.production não encontrado."
  exit 1
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans
docker compose -f "$COMPOSE_FILE" exec -T backend python seed.py
docker image prune -f >/dev/null 2>&1 || true

echo "Deploy concluído com sucesso."
