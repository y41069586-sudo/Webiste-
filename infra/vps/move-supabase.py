#!/usr/bin/env python3
"""Supabase-Umzug (11.11.2026): Hilfsschritte für infra/vps/move-supabase.sh.

prepare <state>  fragt die neuen Zugänge unsichtbar ab, prüft sie und legt eine private Zustandsdatei an (0600).
role-sql <state> gibt das SQL für die bisherige Backend-Rolle aus (mit demselben Passwort) – nur für psql über stdin.
compare <alt> <neu> vergleicht Zeilenzahlen je Tabelle; bricht bei Abweichungen in Geschäftstabellen ab.
apply <state>    stellt .env.worker, die Sicherungs-Datei und die Netlify-Umgebung auf das neue Projekt um.

Keine Zugangsdaten werden ausgegeben. Die Zustandsdatei löscht move-supabase.sh am Ende.
"""
import getpass
import json
import os
import pathlib
import re
import shlex
import sys
import urllib.error
import urllib.request
from urllib.parse import unquote, urlsplit

ROOT = pathlib.Path('/opt/seitenwerk')
WORKER_ENV = ROOT / '.env.worker'
BACKUP_ENV = pathlib.Path('/etc/seitenwerk-backup.env')
NETLIFY_SITE = '80e75e2d-3149-49b0-a522-76a172bbd60b'
URL_KEYS = ('DATABASE_URL', 'QUEUE_DATABASE_URL')
# Abweichungen nur hier erlaubt (die Website schreibt während des Umzugs weiter in die alte Datenbank)
TOLERATED = re.compile(r'^(public\.(events|rate_limits|audit_log|webhook_events|settings)|pgboss\..*)$')


def fail(msg: str) -> None:
    raise SystemExit(f'Abbruch: {msg} Es wurde nichts umgestellt.')


def read_env(path: pathlib.Path) -> dict:
    env = {}
    if not path.is_file():
        return env
    for line in path.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = ''.join(shlex.split(v)) if v.strip() else ''
    return env


def read_state(path: str) -> dict:
    out = {}
    for line in pathlib.Path(path).read_text().splitlines():
        if '=' in line:
            k, v = line.split('=', 1)
            out[k] = v
    return out


def ref_of(url: str) -> tuple:
    u = urlsplit(url)
    if not u.hostname or not u.hostname.endswith('.pooler.supabase.com') or not u.username or '.' not in u.username:
        fail('Verbindung hat nicht das erwartete Supabase-Pooler-Format.')
    role, ref = u.username.rsplit('.', 1)
    return role, ref, u.hostname


def netlify(token: str, method: str, path: str, body=None):
    req = urllib.request.Request(
        'https://api.netlify.com/api/v1' + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        fail(f'Netlify antwortet mit HTTP {e.code}.')


def swap_url(value: str, old: str, new: str, host: str) -> str:
    out = re.sub(r'\.' + re.escape(old) + r'(:[^@/\s]*)?@[A-Za-z0-9.-]+', lambda m: '.' + new + (m.group(1) or '') + '@' + host, value)
    if old in out:
        fail('Unbekanntes Format einer Datenbankverbindung.')
    return out


def prepare(state: str) -> None:
    env = read_env(WORKER_ENV)
    if not env.get('DATABASE_URL') or not env.get('S3_BUCKET') or not env.get('S3_ENDPOINT'):
        fail('Worker-Konfiguration unvollständig (DATABASE_URL/S3_*).')
    role, old_ref, _ = ref_of(env['DATABASE_URL'])
    if old_ref not in env['S3_ENDPOINT']:
        fail('S3_ENDPOINT gehört nicht zum bisherigen Projekt.')
    old_pg = read_env(BACKUP_ENV).get('BACKUP_DATABASE_URL', '')
    if not old_pg:
        fail('/etc/seitenwerk-backup.env mit dem bisherigen Datenbankzugang fehlt.')
    print('Bitte vier Angaben einfügen. Die Eingabe bleibt unsichtbar; danach jeweils Enter.')
    new_pg = getpass.getpass('1) Neue Verbindung (Session pooler, mit Passwort): ').strip()
    nrole, new_ref, new_host = ref_of(new_pg)
    if nrole != 'postgres' or new_ref == old_ref:
        fail('Bitte die Session-pooler-Verbindung des NEUEN Projekts mit Benutzer postgres einfügen.')
    if '[YOUR-PASSWORD]' in new_pg or not urlsplit(new_pg).password:
        fail('In der Verbindung fehlt das Datenbankpasswort.')
    m = re.match(r'^aws-\d+-([a-z0-9-]+)\.pooler\.supabase\.com$', new_host)
    if not m:
        fail('Region der neuen Verbindung nicht erkennbar.')
    key_id = getpass.getpass('2) S3 Access Key ID: ').strip()
    secret = getpass.getpass('3) S3 Secret Access Key: ').strip()
    token = getpass.getpass('4) Netlify Personal Access Token: ').strip()
    for v in (key_id, secret, token):
        if not v or any(c in v for c in '\n\r =\'"'):
            fail('Leere oder ungültige Eingabe.')
    site = netlify(token, 'GET', f'/sites/{NETLIFY_SITE}')
    account = site.get('account_id') if isinstance(site, dict) else None
    if not account:
        fail('Netlify-Seite nicht gefunden.')
    for item in netlify(token, 'GET', f'/accounts/{account}/env?site_id={NETLIFY_SITE}') or []:
        k = item.get('key', '')
        vals = ' '.join(v.get('value', '') for v in item.get('values', []))
        if old_ref in vals and k not in URL_KEYS + ('S3_ENDPOINT',):
            fail(f'Netlify-Variable {k} verweist auf das alte Projekt; bitte melden.')
    lines = {
        'OLD_PG_URL': old_pg,
        'NEW_PG_URL': new_pg,
        'OLD_REF': old_ref,
        'NEW_REF': new_ref,
        'NEW_HOST': new_host,
        'BACKEND_ROLE': role,
        'S3_BUCKET': env['S3_BUCKET'],
        'NEW_S3_ENDPOINT': f'https://{new_ref}.storage.supabase.co/storage/v1/s3',
        'NEW_S3_REGION': m.group(1),
        'NEW_S3_ACCESS_KEY_ID': key_id,
        'NEW_S3_SECRET_ACCESS_KEY': secret,
        'NETLIFY_TOKEN': token,
        'NETLIFY_ACCOUNT': account,
    }
    fd = os.open(state, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        f.write(''.join(f'{k}={v}\n' for k, v in lines.items()))
    print('Angaben übernommen; Netlify-Zugang geprüft.')


def role_sql(state: str) -> None:
    s = read_state(state)
    env = read_env(WORKER_ENV)
    pw = unquote(urlsplit(env['DATABASE_URL']).password or '')
    if not pw:
        fail('Passwort der Backend-Rolle nicht lesbar.')
    role = s['BACKEND_ROLE']
    if not re.match(r'^[a-z_][a-z0-9_]*$', role):
        fail('Unerwarteter Rollenname.')
    q = "'" + pw.replace("'", "''") + "'"
    sys.stdout.write(
        f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN "
        f'CREATE ROLE {role} LOGIN PASSWORD {q}; ELSE ALTER ROLE {role} LOGIN PASSWORD {q}; END IF; END $$;\n'
        f'GRANT {role} TO postgres;\n'
    )


def compare(old_file: str, new_file: str) -> None:
    def load(p):
        out = {}
        for line in pathlib.Path(p).read_text().splitlines():
            if '=' in line:
                t, n = line.rsplit('=', 1)
                out[t.strip()] = int(n)
        return out

    old, new = load(old_file), load(new_file)
    bad = []
    for t, n in sorted(old.items()):
        m = new.get(t)
        if m == n:
            continue
        print(f'  Abweichung {t}: alt {n}, neu {m}')
        if m is None or not TOLERATED.match(t) or m < n * 0.9:
            bad.append(t)
    print(f'Tabellen verglichen: {len(old)}, abweichend kritisch: {len(bad)}')
    if bad:
        fail('Datenbank-Kopie unvollständig.')


def apply(state: str) -> None:
    s = read_state(state)
    old, new, host = s['OLD_REF'], s['NEW_REF'], s['NEW_HOST']
    new_s3 = {
        'S3_ENDPOINT': s['NEW_S3_ENDPOINT'],
        'S3_REGION': s['NEW_S3_REGION'],
        'S3_ACCESS_KEY_ID': s['NEW_S3_ACCESS_KEY_ID'],
        'S3_SECRET_ACCESS_KEY': s['NEW_S3_SECRET_ACCESS_KEY'],
    }
    # 1) Netlify zuerst prüfen und vorbereiten (Fehler hier lässt den Server unverändert)
    token, account = s['NETLIFY_TOKEN'], s['NETLIFY_ACCOUNT']
    updates = []
    for item in netlify(token, 'GET', f'/accounts/{account}/env?site_id={NETLIFY_SITE}') or []:
        k = item.get('key', '')
        if k in URL_KEYS or k in new_s3:
            values = []
            for v in item.get('values', []):
                val = v.get('value', '')
                if k in URL_KEYS and old not in val:
                    fail(f'Netlify-Wert {k} nicht lesbar (geheim markiert?).')
                nv = swap_url(val, old, new, host) if k in URL_KEYS else new_s3[k]
                values.append({kk: vv for kk, vv in v.items() if kk in ('context', 'context_parameter')} | {'value': nv})
            updates.append((k, {'key': k, 'scopes': item.get('scopes', ['builds', 'functions', 'runtime']), 'values': values}))
    if not any(k == 'DATABASE_URL' for k, _ in updates):
        fail('DATABASE_URL in Netlify nicht gefunden.')
    # Netlify zuerst setzen: wirkt erst mit der nächsten Veröffentlichung, ein Fehler hier lässt den Server unverändert
    for k, body in updates:
        netlify(token, 'PUT', f'/accounts/{account}/env/{k}?site_id={NETLIFY_SITE}', body)
    # 2) Server: Sicherungskopie der Worker-Konfiguration, dann gezielt ersetzen
    backup = ROOT / '.env.worker.vor-supabase-umzug'
    if not backup.exists():
        fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as f:
            f.write(WORKER_ENV.read_text())
    safe = re.compile(r'^[A-Za-z0-9_./:@%+,~-]*$')
    out, seen = [], set()
    for line in WORKER_ENV.read_text().splitlines():
        key = line.split('=', 1)[0].strip() if '=' in line and not line.lstrip().startswith('#') else ''
        if key in URL_KEYS:
            line = swap_url(line, old, new, host)
        elif key in new_s3:
            v = new_s3[key]
            line = f'{key}={v if safe.match(v) else shlex.quote(v)}'
            seen.add(key)
        out.append(line)
    for k, v in new_s3.items():
        if k not in seen:
            out.append(f'{k}={v if safe.match(v) else shlex.quote(v)}')
    tmp = WORKER_ENV.with_name('.env.worker.tmp-umzug')
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as f:
        f.write('\n'.join(out) + '\n')
    os.replace(tmp, WORKER_ENV)
    if old in WORKER_ENV.read_text():
        print('Hinweis: .env.worker enthält noch einen Verweis auf das alte Projekt (Name wird nicht angezeigt).')
    # 3) Sicherungszugang (Timer bleibt aus) auf das neue Projekt
    b = BACKUP_ENV.read_text().splitlines()
    b = [('BACKUP_DATABASE_URL=' + shlex.quote(s['NEW_PG_URL'])) if l.startswith('BACKUP_DATABASE_URL=') else l for l in b]
    BACKUP_ENV.write_text('\n'.join(b) + '\n')
    os.chmod(BACKUP_ENV, 0o600)
    print('Umgestellt: Worker, Sicherungszugang und Netlify (' + ', '.join(k for k, _ in updates) + ').')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'prepare':
        prepare(sys.argv[2])
    elif cmd == 'role-sql':
        role_sql(sys.argv[2])
    elif cmd == 'compare':
        compare(sys.argv[2], sys.argv[3])
    elif cmd == 'apply':
        apply(sys.argv[2])
    else:
        fail('Unbekannter Schritt.')
