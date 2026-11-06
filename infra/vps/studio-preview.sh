#!/usr/bin/env bash
# One fictional preview. Keep the daemon paused; preserve paid artifacts and share existing HTML without regeneration.
set -euo pipefail
umask 077
ROOT="${DIR:-/opt/seitenwerk}"
RELEASE="${RELEASE:?Vollständigen geprüften Release-Commit setzen.}"
[[ "$RELEASE" =~ ^[a-f0-9]{40}$ ]] || exit 1
cd "$ROOT"
git diff --quiet && git diff --cached --quiet || { echo 'Lokale Codeänderungen vorhanden; nichts geändert.' >&2; exit 1; }
[[ -s .env.worker ]] || { echo '.env.worker fehlt.' >&2; exit 1; }
OUTPUT="${STUDIO_PREVIEW_DIR:-/opt/seitenwerk-design-preview-v2}"
[[ ! -L "$OUTPUT" ]] || { echo 'Unerwarteter Ausgabe-Symlink.' >&2; exit 1; }
existing_html=false
recover_pending=false
if [[ -e "$OUTPUT/started.json" ]]; then
  if [[ -s "$OUTPUT/index.html" ]]; then
    existing_html=true
  elif [[ "${STUDIO_PREVIEW_RECOVER:-false}" = true && ( -s "$OUTPUT/attempt-2.json" || -s "$OUTPUT/attempt-1.json" ) ]]; then
    recover_pending=true
  else
    echo 'Dieser Einzeltest wurde bereits begonnen. Keine weitere KI-Generierung.' >&2
    [[ ! -f "$OUTPUT/result.json" ]] || cat "$OUTPUT/result.json"
    exit 1
  fi
elif [[ -e "$OUTPUT/index.html" ]]; then
  echo 'HTML ohne passenden Startnachweis; nichts überschrieben.' >&2
  exit 1
fi
if [[ "${STUDIO_PREVIEW_RECOVER:-false}" = true && "$recover_pending" != true && "$existing_html" != true ]]; then
  echo 'Keine gespeicherte fiktive Umsetzung zur Wiederherstellung; kein KI-Aufruf gestartet.' >&2
  exit 1
fi
mapfile -t containers < <(docker ps -aq --filter label=com.docker.compose.project=seitenwerk-worker --filter label=com.docker.compose.service=worker)
[[ "${#containers[@]}" = 1 ]] || { echo 'Vorhandener Worker nicht eindeutig.' >&2; exit 1; }
files="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "${containers[0]}")"
IFS=',' read -r -a config_files <<< "$files"
[[ "${#config_files[@]}" -gt 0 ]] || exit 1
compose=(docker compose)
for file in "${config_files[@]}"; do
  [[ "$file" = "$ROOT/"* && -f "$file" ]] || { echo 'Vorhandene Compose-Dateien fehlen.' >&2; exit 1; }
  compose+=(-f "$file")
done
"${compose[@]}" stop worker
source_mounts=()
source_snapshot=''
cleanup() {
  if [[ -n "$source_snapshot" && -d "$source_snapshot" ]]; then
    rm -rf -- "$source_snapshot"
  fi
}
trap cleanup EXIT
if [[ "${STUDIO_PREVIEW_USE_CHECKOUT:-false}" = true ]]; then
  git fetch origin claude/website-brief-maschine-0d0s37
  git merge-base --is-ancestor "$RELEASE" FETCH_HEAD || { echo 'Release nicht veröffentlicht.' >&2; exit 1; }
  git merge-base --is-ancestor HEAD "$RELEASE" || { echo 'Lokaler Stand abweichend; kein Zurücksetzen.' >&2; exit 1; }
  git diff --quiet HEAD "$RELEASE" -- Dockerfile pnpm-lock.yaml package.json pnpm-workspace.yaml packages/templates packages/core/package.json apps/worker/package.json apps/worker/src \
    || { echo 'Abhängigkeiten oder gebaute Vorlagen geändert; Quellcode-Test ohne Neubuild gestoppt.' >&2; exit 1; }
  git merge --ff-only "$RELEASE"
  source_snapshot=$(mktemp -d /tmp/seitenwerk-studio-source.XXXXXX)
  python3 "$ROOT/infra/vps/stage-studio-source.py" --repo "$ROOT" --release "$RELEASE" --output "$source_snapshot"
  source_mounts=(-v "$source_snapshot/packages/core/src:/repo/packages/core/src:ro" -v "$source_snapshot/packages/core/scripts:/repo/packages/core/scripts:ro")
elif [[ "${STUDIO_PREVIEW_USE_BUILT_IMAGE:-false}" != true && "$existing_html" != true && "$recover_pending" != true ]]; then
  git fetch origin claude/website-brief-maschine-0d0s37
  git merge-base --is-ancestor "$RELEASE" FETCH_HEAD || { echo 'Release nicht veröffentlicht.' >&2; exit 1; }
  git merge-base --is-ancestor HEAD "$RELEASE" || { echo 'Lokaler Stand abweichend; kein Zurücksetzen.' >&2; exit 1; }
  git merge --ff-only "$RELEASE"
  RESUME_WORKER=false RESTORE_REPAIR_PAUSE=false RELEASE="$RELEASE" DIR="$ROOT" bash infra/vps/update-worker.sh
fi
install -d -m 0700 -o 1000 -g 1000 "$OUTPUT"
run=("${compose[@]}" run --rm -T --no-deps "${source_mounts[@]}" -v "$OUTPUT:/preview")
share_preview() {
  "${run[@]}" -e "STUDIO_PREVIEW_DEPLOY_ID=${STUDIO_PREVIEW_DEPLOY_ID:-}" \
    --entrypoint node worker --import tsx /repo/packages/core/scripts/share-studio-preview.ts
}
if [[ "$existing_html" = true ]]; then
  echo 'Vorhandener Entwurf wird verwendet; keine neuen KI-Aufrufe.'
  if [[ "${STUDIO_PREVIEW_SHARE:-false}" = true ]]; then
    share_preview
  else
    echo "Vorhandener Entwurf: $OUTPUT/index.html"
  fi
  exit 0
fi
if [[ "$recover_pending" = true ]]; then
  echo 'Gespeicherter Entwurf wird als ausdrücklich ungeprüfte Ansicht wiederhergestellt; keine neuen KI-Aufrufe.'
  "${run[@]}" -e LLM_PROVIDER=mock -e DRY_RUN=true \
    -e PAYMENT_PROVIDER=mock -e EMAIL_PROVIDER=mock -e MAIL_PROVIDER=mock \
    -e REGISTRAR_PROVIDER=mock -e HOSTING_PROVIDER=mock -e LEAD_SOURCE=mock \
    -e STUDIO_PREVIEW_RECOVER_CONFIRM=existing-fictional-only-no-ai \
    --entrypoint node worker --import tsx /repo/packages/core/scripts/recover-studio-preview.ts
  tar -C "$OUTPUT" -czf "$OUTPUT.tar.gz" .
  echo 'Automatisierungs-Worker bleibt pausiert. Inhaltsprüfung/Freigabe bleibt offen.'
  if [[ "${STUDIO_PREVIEW_SHARE:-false}" = true ]]; then
    share_preview
  fi
  exit 0
fi
preview=("${run[@]}" -e DRY_RUN=true -e LLM_PROVIDER=anthropic
  -e PAYMENT_PROVIDER=mock -e EMAIL_PROVIDER=mock -e MAIL_PROVIDER=mock
  -e REGISTRAR_PROVIDER=mock -e HOSTING_PROVIDER=mock -e LEAD_SOURCE=mock
  -e "STUDIO_PREVIEW_SHARE=${STUDIO_PREVIEW_SHARE:-false}"
  -e STUDIO_PREVIEW_CONFIRM=one-fictional-demo-no-send
  --entrypoint node worker --import tsx /repo/packages/core/scripts/studio-preview.ts --out=/preview)
if ! "${preview[@]}" --preflight; then
  echo 'Vorprüfung fehlgeschlagen; keine KI-Generierung gestartet. Die konkrete Fehlermeldung steht oben.' >&2
  exit 1
fi
status=0
"${preview[@]}" || status=$?
if [[ -f "$OUTPUT/result.json" ]]; then
  tar -C "$OUTPUT" -czf "$OUTPUT.tar.gz" .
  echo "Prüfdateien: $OUTPUT.tar.gz (privat)."
fi
echo 'Automatisierungs-Worker bleibt pausiert. Keine Briefe, E-Mails, Kundenzahlungen oder Domainkäufe.'
# The HTML is an unapproved fictional preview. A later QA error must not force another paid generation to view it.
if [[ "${STUDIO_PREVIEW_SHARE:-false}" = true && -s "$OUTPUT/index.html" ]]; then
  share_status=0
  share_preview || share_status=$?
  [[ "$status" != 0 ]] || status=$share_status
fi
exit "$status"
