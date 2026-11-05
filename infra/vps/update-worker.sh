#!/usr/bin/env bash
# Update an already configured worker; retain the exact Compose files and paused/running state.
set -euo pipefail
ROOT="${DIR:-/opt/seitenwerk}"
BRANCH='claude/website-brief-maschine-0d0s37'
RELEASE="${RELEASE:?Der freigegebene vollständige Commit fehlt.}"
[[ "$RELEASE" =~ ^[a-f0-9]{40}$ ]] || { echo 'Ungültiger Release-Commit.' >&2; exit 1; }
cd "$ROOT"
[[ "$(git rev-parse --show-toplevel)" = "$ROOT" ]] || { echo 'Unerwartetes Repository.' >&2; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo 'Lokale Codeänderungen vorhanden; nichts überschrieben.' >&2; exit 1; }
[[ -s .env.worker ]] || { echo 'Die vorhandene .env.worker fehlt.' >&2; exit 1; }
mapfile -t containers < <(docker ps -aq --filter label=com.docker.compose.project=seitenwerk-worker --filter label=com.docker.compose.service=worker)
[[ "${#containers[@]}" = 1 && -n "${containers[0]}" ]] || { echo 'Bestehender Worker nicht eindeutig gefunden.' >&2; exit 1; }
container="${containers[0]}"
was_running="$(docker inspect -f '{{.State.Running}}' "$container")"
mode="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container" | sed -n 's/^DRY_RUN=//p')"
[[ "$mode" = true || "$mode" = false ]] || { echo 'Bestehender DRY_RUN-Modus nicht eindeutig.' >&2; exit 1; }
files="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$container")"
IFS=',' read -r -a config_files <<< "$files"
compose=(docker compose)
[[ "${#config_files[@]}" -gt 0 ]] || exit 1
for file in "${config_files[@]}"; do
  [[ "$file" = "$ROOT/"* && -f "$file" ]] || { echo 'Bestehende Compose-Konfiguration nicht verfügbar.' >&2; exit 1; }
  compose+=(-f "$file")
done

git fetch origin "$BRANCH"
git merge-base --is-ancestor "$RELEASE" FETCH_HEAD || { echo 'Release fehlt auf dem veröffentlichten Branch.' >&2; exit 1; }
git merge-base --is-ancestor HEAD "$RELEASE" || { echo 'Lokaler Stand ist neuer oder abweichend; kein Zurücksetzen.' >&2; exit 1; }
git merge --ff-only "$RELEASE"
# Parse privately; never print the expanded configuration or credentials.
"${compose[@]}" config --format json | python3 -c 'import json,sys; x=json.load(sys.stdin); actual=str(x["services"]["worker"]["environment"]["DRY_RUN"]).lower(); assert actual==sys.argv[1], "DRY_RUN würde geändert; Aktualisierung gestoppt."' "$mode"
"${compose[@]}" build worker
"${compose[@]}" run --rm -T --no-deps --entrypoint node worker --import tsx --input-type=module -e "const m=await import('/repo/packages/templates/src/index.ts');if(m.FREE_DESIGN_VERSION!=='free-design-1')process.exit(1);console.log('Freie Gestaltung im neuen Image bestätigt.');"
if [[ "$was_running" != true ]]; then
  # `create` never starts containers and does not accept the run/up-only --no-deps flag.
  "${compose[@]}" create worker
  echo "Worker-Code aktualisiert. Worker bleibt pausiert; DRY_RUN=$mode."
  exit 0
fi
"${compose[@]}" up -d --no-deps worker
for ((attempt=0; attempt<36; attempt++)); do
  current="$("${compose[@]}" ps -q worker)"
  health="$(docker inspect -f '{{.State.Health.Status}}' "$current")"
  if [[ "$health" = healthy ]]; then
    echo "Worker aktualisiert und gesund; DRY_RUN=$mode unverändert."
    git log -1 --format='Stand: %h %s'
    exit 0
  fi
  [[ "$health" != unhealthy ]] || break
  sleep 5
done
echo 'Gesundheitscheck fehlgeschlagen. Worker im vorhandenen Admin/Monitoring prüfen.' >&2
exit 1
