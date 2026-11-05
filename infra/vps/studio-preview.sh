#!/usr/bin/env bash
# Update the reviewed release and run precisely one fictional sample, keeping the daemon paused.
set -euo pipefail
umask 077
ROOT="${DIR:-/opt/seitenwerk}"
RELEASE="${RELEASE:?Vollständigen geprüften Release-Commit setzen.}"
[[ "$RELEASE" =~ ^[a-f0-9]{40}$ ]] || exit 1
cd "$ROOT"
git diff --quiet && git diff --cached --quiet || { echo 'Lokale Codeänderungen vorhanden; nichts geändert.' >&2; exit 1; }
[[ -s .env.worker ]] || { echo '.env.worker fehlt.' >&2; exit 1; }
OUTPUT="${STUDIO_PREVIEW_DIR:-/opt/seitenwerk-design-preview}"
[[ ! -L "$OUTPUT" ]] || { echo 'Unerwarteter Ausgabe-Symlink.' >&2; exit 1; }
[[ ! -e "$OUTPUT/started.json" ]] || { echo 'Einzeltest bereits begonnen; vorhandene Dateien prüfen. Kein erneuter KI-Aufruf.' >&2; exit 1; }
mapfile -t containers < <(docker ps -aq --filter label=com.docker.compose.project=seitenwerk-worker --filter label=com.docker.compose.service=worker)
[[ "${#containers[@]}" = 1 ]] || { echo 'Vorhandener Worker nicht eindeutig.' >&2; exit 1; }
files="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "${containers[0]}")"
IFS=',' read -r -a config_files <<< "$files"
compose=(docker compose)
for file in "${config_files[@]}"; do
  [[ "$file" = "$ROOT/"* && -f "$file" ]] || exit 1
  compose+=(-f "$file")
done
# Pausing is intentional for the single paid test; never restart the queued automation here.
"${compose[@]}" stop worker
git fetch origin claude/website-brief-maschine-0d0s37
git merge-base --is-ancestor "$RELEASE" FETCH_HEAD || { echo 'Release nicht veröffentlicht.' >&2; exit 1; }
git merge-base --is-ancestor HEAD "$RELEASE" || { echo 'Lokaler Stand abweichend; kein Zurücksetzen.' >&2; exit 1; }
git merge --ff-only "$RELEASE"
RELEASE="$RELEASE" DIR="$ROOT" bash infra/vps/update-worker.sh
install -d -m 0700 -o 1000 -g 1000 "$OUTPUT"
status=0
"${compose[@]}" run --rm -T --no-deps \
  -v "$OUTPUT:/preview" \
  -e DRY_RUN=true -e LLM_PROVIDER=anthropic \
  -e PAYMENT_PROVIDER=mock -e EMAIL_PROVIDER=mock -e MAIL_PROVIDER=mock \
  -e REGISTRAR_PROVIDER=mock -e HOSTING_PROVIDER=mock -e LEAD_SOURCE=mock \
  -e STUDIO_PREVIEW_CONFIRM=one-fictional-demo-no-send \
  --entrypoint node worker --import tsx /repo/packages/core/scripts/studio-preview.ts --out=/preview || status=$?
if [[ -f "$OUTPUT/result.json" ]]; then
  tar -C "$OUTPUT" -czf "$OUTPUT.tar.gz" .
  echo "Prüfdateien: $OUTPUT.tar.gz (privat)."
fi
echo 'Worker bleibt pausiert. Keine Demo veröffentlicht, kein Brief und keine E-Mail versendet.'
exit "$status"
