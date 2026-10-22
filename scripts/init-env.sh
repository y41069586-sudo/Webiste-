#!/usr/bin/env bash
# Erzeugt .env aus .env.example mit zufälligen Secrets.
#   ./scripts/init-env.sh           → Produktionsvorlage (Domains danach eintragen)
#   ./scripts/init-env.sh --local   → lokaler Start auf http://localhost:3000
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  echo ".env existiert bereits – nichts geändert." >&2
  exit 1
fi
rand() { openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-"$1"; }
DB_PW=$(rand 32)
SECRET=$(rand 64)
cp .env.example .env
sed -i.bak \
  -e "s#^POSTGRES_PASSWORD=.*#POSTGRES_PASSWORD=${DB_PW}#" \
  -e "s#^DATABASE_URL=.*#DATABASE_URL=postgres://wbm:${DB_PW}@postgres:5432/wbm#" \
  -e "s#^SESSION_SECRET=.*#SESSION_SECRET=${SECRET}#" \
  .env
if [ "${1:-}" = "--local" ]; then
  sed -i.bak \
    -e "s#^APP_URL=.*#APP_URL=http://localhost:3000#" \
    -e "s#^DEMO_DOMAIN=.*#DEMO_DOMAIN=localhost:3000#" \
    -e "s#^TRACK_DOMAIN=.*#TRACK_DOMAIN=localhost:3000#" \
    -e "s#^MAIL_PROVIDER=.*#MAIL_PROVIDER=mock#" \
    -e "s#^REGISTRAR_PROVIDER=.*#REGISTRAR_PROVIDER=mock#" \
    -e "s#^HOSTING_PROVIDER=.*#HOSTING_PROVIDER=mock#" \
    .env
fi
rm -f .env.bak
chmod 600 .env
echo ".env erstellt. Als Nächstes: docker compose up -d --build && docker compose exec worker node --import tsx src/cli.ts admin:create"
