# VPS-Vorschlag für den Worker (27.10.2026) – nicht bestellt

Rahmen laut Betreiber: höchstens 15 €/Monat. Nur der langlebige Worker (pg-boss, Cron, Chromium/PDF) läuft
dort; Web/Firmenwebsite bleiben auf Netlify, Datenbank und privater Storage bei Supabase. Keine zweite
Produktionsdatenbank (`docker-compose.worker.yml`). **Kein Server bestellt oder gestartet.**

## Gemessener Bedarf (vollständiges Chromium-Image, lokal)

Build `docker build --target worker` des unveränderten `Dockerfile` in dieser Umgebung (overlayfs):
erfolgreich, Image **2,1 GB**. Smoke mit der Härtung aus der Compose-Datei (read-only, `cap_drop: ALL`,
`no-new-privileges`, 2 GB-Limit, 1,5 CPU, pids 256), Mock-Anbieter, lokale Generalprobe-DB als
Backend-Rolle `seitenwerk_admin_backend` (siehe `packages/core/scripts/rehearse-production-upgrade.ts`):

| Prüfung | Ergebnis |
|---|---|
| Health | `{"status":"ok","db":true,"queue":true}`, alle Crons eingeplant, ohne Migration/Queue-Anlage |
| Queue-Job `refresh-funnel` als Backend-Rolle | `completed` in 40 ms (bestätigt Migration 0019 im Container) |
| Chromium | A4-PDF und Handy-Screenshot im read-only-Container; 12 ganzseitige Screenshots aus 6 Vorlagen in 15 s |
| RAM | Leerlauf 197 MiB, Spitze beim Rendern **623 MiB** |
| SIGTERM | sauber beendet in 0,12 s, Exit 0, kein OOM |
| Neustart | wieder gesund, 0 Fehlerzeilen im Log |
| Logs | 82 Zeilen ohne DB-Passwort, Verbindungsstring oder Session-Secret; E-Mail redigiert |

Nicht geprüft: echte Anbieter, Supabase-Pooler/TLS, S3-Storage, Dauerbetrieb über Tage, Alarm-Mails.

## Tarifvergleich (offizielle Anbieterseiten, abgerufen 27.10.2026)

| Tarif | vCPU / RAM / SSD | Preis/Monat | Bewertung |
|---|---|---|---|
| **netcup VPS 500 G12.5** | 2 / 4 GB / 64 GB | 9,50 € brutto (8,26 € netto) bei 12 Monaten Laufzeit | **Empfehlung**: 4 GB lassen Raum über der gemessenen Spitze; Standort Nürnberg wählbar |
| netcup VPS 1000 G12.5 | 4 / 8 GB / 128 GB | 16,68 € brutto | über dem Rahmen |
| Hetzner CPX12 | 1 / 2 GB / 40 GB | 11,99 € netto inkl. IPv4 | 2 GB knapp (OS + Docker + 623 MiB Spitze); laut Seite derzeit nicht bestellbar |
| Hetzner CX23 (Cost-Optimized) | 2 / 4 GB / 40 GB | laut Drittquellen nach Preisanhebung Juni 2026 ca. 5,49 € netto | derzeit „not available“ |

Quellen: [netcup VPS](https://www.netcup.com/de/server/vps), [Hetzner Regular Performance](https://www.hetzner.com/cloud/regular-performance),
[Hetzner Cloud](https://www.hetzner.com/cloud/). Drittquellen zu CX-Preisen widersprechen sich; vor Bestellung im
Anbieterkonto bestätigen.

## Vor einer Bestellung zu klären (Betreiberentscheidung)

- 12-Monats-Bindung bei netcup akzeptieren (ca. 114 € brutto/Jahr) oder Monatslaufzeit zu höherem, hier nicht
  verifiziertem Preis.
- Auftragsverarbeitungsvertrag beim Anbieter abschließen; Standort EU (Nürnberg) wählen.
- IPv6/Direct oder Supabase-Session-Pooler 5432 für Worker/Queue (nicht Transaction 6543).
- Danach in dieser Reihenfolge: Backup/Restore-Nachweis → freigegebene Migration 0011–0019 → `queue:prepare
  --apply` mit Wartungsrolle → `infra/queue-permissions.sql` → Worker-Start mit `.env.worker` (chmod 600).
