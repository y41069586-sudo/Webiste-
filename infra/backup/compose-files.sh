#!/usr/bin/env bash
# Gibt die Compose-Dateien aus, mit denen der laufende Worker gestartet wurde.
# Läuft der Worker live (DRY_RUN=false, per LIVE=1 gestartet), müssen auch die Sicherungs-Hilfscontainer die
# Live-Datei verwenden – sonst trifft DRY_RUN=true auf Live-Stripe-Schlüssel und der Start bricht ab.
# Die Hilfscontainer lesen nur Datenbank/Speicher; sie verschicken nichts.
compose_files() {
  local files=(-f docker-compose.worker.yml)
  if [ -f docker-compose.worker.live.yml ]; then
    local id
    id=$(docker compose -f docker-compose.worker.yml ps -q worker 2>/dev/null | head -n1 || true)
    if [ -n "$id" ] && docker inspect "$id" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep -qx 'DRY_RUN=false'; then
      files+=(-f docker-compose.worker.live.yml)
    fi
  fi
  printf '%s\n' "${files[@]}"
}
