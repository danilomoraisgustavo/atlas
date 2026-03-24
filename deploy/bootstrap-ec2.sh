#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/atlas-frota}"
REPO_SSH_URL="${REPO_SSH_URL:-}"
BRANCH="${BRANCH:-main}"

if [[ -z "$REPO_SSH_URL" ]]; then
  echo "Defina REPO_SSH_URL com a URL SSH do repositório GitHub."
  exit 1
fi

sudo apt-get update
sudo apt-get install -y ca-certificates curl git

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi

if ! groups "$USER" | grep -q docker; then
  sudo usermod -aG docker "$USER"
  echo "Usuário adicionado ao grupo docker. Faça logout/login antes do próximo deploy."
fi

sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$BRANCH" "$REPO_SSH_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

cd "$APP_DIR"

if [[ ! -f ".env.production" ]]; then
  cp .env.production.example .env.production
  echo "Arquivo .env.production criado a partir do exemplo. Ajuste os valores antes do primeiro deploy."
fi

echo "Bootstrap concluído. Próximo passo:"
echo "1. Ajustar .env.production"
echo "2. Rodar: chmod +x deploy/deploy.sh && ./deploy/deploy.sh"
