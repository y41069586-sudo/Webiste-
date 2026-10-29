#!/usr/bin/env bash
# Einrichtung und Aktualisierung des Worker-Servers (Ubuntu 24.04, als root).
#
#   curl -fsSL https://raw.githubusercontent.com/y41069586-sudo/Webiste-/claude/website-brief-maschine-0d0s37/infra/vps/setup.sh | bash
#
# Erster Lauf: Docker, Firewall und Brute-Force-Schutz installieren, Code holen, nach dem Einmal-Code aus
# Admin → Einstellungen → „Worker-Server einrichten“ fragen und damit .env.worker von der Admin-App abholen,
# Worker bauen und starten. Weitere Läufe: Code aktualisieren und Worker neu bauen (.env.worker bleibt).
# Neue Zugangsdaten aus der Admin-App übernehmen (z. B. nach neuen Variablen in Netlify): ... | NEU=1 bash
# Standard bleibt DRY_RUN=true; nur nach freigegebenem Live-Start explizit LIVE=1 hinzufügen.
# LIVE=1 verwendet die additive Live-Datei; weitere Versand-/Rechts-/Budgetgates bleiben wirksam.
# Es werden keine Ports geöffnet.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/y41069586-sudo/Webiste-.git}"
BRANCH="${BRANCH:-claude/website-brief-maschine-0d0s37}"
APP_URL="${APP_URL:-https://seitenwerkworld.netlify.app}"
DIR="${DIR:-/opt/seitenwerk}"
COMPOSE=(docker compose -f docker-compose.worker.yml)
if [ "${LIVE:-0}" = 1 ]; then
  COMPOSE+=(-f docker-compose.worker.live.yml)
fi

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mFehler: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Bitte als root ausführen."
. /etc/os-release
[ "${ID:-}" = ubuntu ] || fail "Erwartet Ubuntu, gefunden: ${PRETTY_NAME:-unbekannt}."

step "Systempakete (Docker, Git, Firewall, fail2ban)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 git curl ufw fail2ban unattended-upgrades >/dev/null
systemctl enable --now docker fail2ban >/dev/null

step "Firewall: nur SSH eingehend"
ufw allow OpenSSH >/dev/null
ufw --force enable >/dev/null
ufw status | head -n 5

step "Code holen ($BRANCH)"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch -q origin "$BRANCH"
  git -C "$DIR" checkout -q "$BRANCH"
  git -C "$DIR" merge -q --ff-only "origin/$BRANCH"
else
  git clone -q --depth 50 --branch "$BRANCH" "$REPO_URL" "$DIR"
fi
cd "$DIR"
git log -1 --format='Stand: %h %s'

if [ "${NEU:-0}" = 1 ] && [ -s .env.worker ]; then
  mv .env.worker .env.worker.alt
  chmod 600 .env.worker.alt
  echo "Bisherige Zugangsdaten gesichert als .env.worker.alt."
fi

if [ ! -s .env.worker ]; then
  step "Zugangsdaten per Einmal-Code abholen"
  echo "Admin öffnen → Einstellungen → „Worker-Server einrichten“ → Code erzeugen."
  for attempt in 1 2 3; do
    read -r -p "Einmal-Code (z. B. ABCD-EFGH-JKMN): " code </dev/tty
    code="$(printf '%s' "$code" | tr -cd 'A-Za-z0-9-')"
    umask 077
    status="$(curl -sS -o .env.worker.tmp -w '%{http_code}' -X POST "$APP_URL/api/worker-bootstrap" \
      -H 'content-type: application/json' --data "{\"code\":\"$code\"}" || echo 000)"
    if [ "$status" = 200 ] && grep -q '^DATABASE_URL=' .env.worker.tmp; then
      mv .env.worker.tmp .env.worker
      chmod 600 .env.worker
      echo "Zugangsdaten gespeichert ($DIR/.env.worker, nur für root lesbar)."
      break
    fi
    rm -f .env.worker.tmp
    case "$status" in
      403) echo "Code ungültig, abgelaufen oder schon benutzt. Bitte im Admin einen neuen Code erzeugen." ;;
      429) fail "Zu viele Versuche. In einer Stunde erneut versuchen." ;;
      *) echo "Admin-App nicht erreichbar (HTTP $status)." ;;
    esac
    [ "$attempt" -lt 3 ] || fail "Kein gültiger Code. Skript einfach erneut starten."
  done
else
  echo "Vorhandene .env.worker wird weiter verwendet."
fi

step "Worker bauen und starten (dauert beim ersten Mal einige Minuten)"
"${COMPOSE[@]}" up -d --build --remove-orphans
docker image prune -f >/dev/null

step "Warten auf den Gesundheitscheck"
for _ in $(seq 1 40); do
  state="$(docker inspect -f '{{.State.Health.Status}}' "$("${COMPOSE[@]}" ps -q worker)" 2>/dev/null || echo unbekannt)"
  case "$state" in
    healthy)
      if [ "${LIVE:-0}" = 1 ]; then
        printf '\n\033[1;32mFertig: Worker läuft mit expliziter Live-Konfiguration (DRY_RUN=false).\033[0m\n'
        echo "Status: cd $DIR && docker compose -f docker-compose.worker.yml -f docker-compose.worker.live.yml ps"
        echo "Weitere Live-Aktualisierungen ebenfalls ausdrücklich mit LIVE=1 starten."
      else
        printf '\n\033[1;32mFertig: Worker läuft (DRY_RUN=true).\033[0m\n'
        echo "Status: cd $DIR && docker compose -f docker-compose.worker.yml ps"
        echo "Aktualisieren: dieses Skript erneut ausführen."
      fi
      exit 0
      ;;
    unhealthy) break ;;
  esac
  sleep 5
done
"${COMPOSE[@]}" logs --tail 40 worker || true
fail "Worker ist nicht gesund (Status: ${state:-unbekannt}). Die letzten Zeilen oben bitte als Screenshot schicken."
