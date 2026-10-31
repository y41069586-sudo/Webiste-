#!/usr/bin/env bash
# Existing VPS only. Installs a backup timer without starting the automation worker.
set -euo pipefail
umask 077
repo=$(cd "$(dirname "$0")/../.." && pwd)
[ "$repo" = /opt/seitenwerk ] || { echo 'Installation erwartet das vorhandene Projekt /opt/seitenwerk.' >&2; exit 1; }
[ "$(id -u)" = 0 ] || { echo 'Installation als root auf dem vorhandenen VPS ausführen.' >&2; exit 1; }
cd "$repo"
if [ ! -s /etc/seitenwerk-backup.env ]; then
  python3 - <<'PY'
import getpass,os,pathlib,shlex,tempfile
from urllib.parse import urlsplit,urlunsplit,quote
p=pathlib.Path('/opt/seitenwerk/.env.worker')
if not p.is_file() or p.is_symlink(): raise SystemExit('Private Worker-Konfiguration fehlt.')
env={}
for line in p.read_text().splitlines():
    if line.strip() and not line.startswith('#') and '=' in line:
        name,value=line.split('=',1)
        parsed=shlex.split(value)
        env[name]=''.join(parsed)
u=urlsplit(env.get('QUEUE_DATABASE_URL') or env.get('DATABASE_URL',''))
if not u.hostname or not u.hostname.endswith('.pooler.supabase.com') or not u.username or '.' not in u.username:
    raise SystemExit('Vorhandene Supabase-Sessionverbindung privat prüfen; nichts gespeichert.')
if len(env.get('ENCRYPTION_KEY',''))<32:
    raise SystemExit('Vorhandener privater ENCRYPTION_KEY fehlt; nichts gespeichert.')
password=getpass.getpass('Supabase-Datenbankpasswort einmalig hier eingeben (unsichtbar): ')
if not password or '\n' in password or '\r' in password: raise SystemExit('Keine gültige Eingabe; nichts gespeichert.')
project=u.username.rsplit('.',1)[1]
netloc='postgres.'+project+':'+quote(password,safe='')+'@'+u.hostname+':5432'
url=urlunsplit(('postgresql',netloc,u.path,'',''))
with tempfile.NamedTemporaryFile(mode='w',dir='/etc',prefix='.seitenwerk-backup-',delete=False) as f:
    os.fchmod(f.fileno(),0o600)
    f.write('BACKUP_DATABASE_URL='+shlex.quote(url)+'\nBACKUP_KEEP_DAYS=14\n')
    f.flush();os.fsync(f.fileno());tmp=f.name
os.replace(tmp,'/etc/seitenwerk-backup.env')
print('Privater Backupzugang gespeichert; keine Zugangsdaten ausgegeben.')
PY
fi
install -m 0644 infra/backup/seitenwerk-backup.service /etc/systemd/system/seitenwerk-backup.service
install -m 0644 infra/backup/seitenwerk-backup.timer /etc/systemd/system/seitenwerk-backup.timer
# Build the updated CLI/service code, but DO NOT up/start/recreate the worker.
docker compose -f docker-compose.worker.yml build worker
systemctl daemon-reload
# First real verified copy must succeed before the regular timer is enabled.
systemctl start seitenwerk-backup.service
systemctl enable --now seitenwerk-backup.timer
systemctl list-timers seitenwerk-backup.timer --no-pager
echo 'Backupplan installiert und erster Lauf bestanden. Automatisierungs-Worker unverändert.'
