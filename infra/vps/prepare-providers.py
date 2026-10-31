#!/usr/bin/env python3
"""Update only non-secret provider selectors. Never starts Docker or changes a paid mode."""
import json
import os
from pathlib import Path
import re
import shlex
import sys
import tempfile


def prepare(path: Path, apply: bool = False):
    if not path.is_absolute() or path.is_symlink() or not path.is_file():
        raise ValueError('Vorhandene private Worker-Datei erforderlich.')
    original = path.read_bytes()
    values = {}
    for line in original.decode().splitlines():
        if line.strip() and not line.startswith('#') and '=' in line:
            name, value = line.split('=', 1)
            if name in values:
                raise ValueError('Doppelte Konfigurationszeile; nichts geändert.')
            values[name] = ''.join(shlex.split(value))
    if not values.get('EMAIL_API_KEY') or not (values.get('NETLIFY_API_TOKEN') or values.get('NELITFY_API_TOKEN')):
        raise ValueError('Vorhandene Mail-/Hosting-Zugangsdaten fehlen; nichts geändert.')
    desired = {'EMAIL_PROVIDER': 'resend', 'HOSTING_PROVIDER': 'netlify',
               'REGISTRAR_PROVIDER': 'mock', 'REGISTRAR_ENV': 'sandbox',
               'STRIPE_MODE': 'test', 'DRY_RUN': 'true'}
    updated = original
    changed = []
    for name, value in desired.items():
        if values.get(name) == value:
            continue
        changed.append(name)
        pattern = rb'(?m)^' + name.encode() + rb'=[^\r\n]*'
        if name in values:
            updated, count = re.subn(pattern, name.encode()+b'='+value.encode(), updated)
            if count != 1:
                raise ValueError('Konfiguration nicht eindeutig; nichts geändert.')
        else:
            updated = updated.rstrip(b'\r\n') + b'\n' + name.encode()+b'='+value.encode()+b'\n'
    if apply and changed:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.env.worker.', delete=False) as f:
            os.fchmod(f.fileno(), 0o600)
            f.write(updated)
            f.flush()
            os.fsync(f.fileno())
            tmp = f.name
        os.replace(tmp, path)
    return {'applied': apply, 'changedKeys': changed, 'workerRestarted': False,
            'stripeMode': 'test', 'registrarProvider': 'mock', 'dryRun': True}


if __name__ == '__main__':
    try:
        if len(sys.argv) not in (2, 3) or (len(sys.argv) == 3 and sys.argv[2] != '--apply'):
            raise ValueError('Aufruf: prepare-providers.py /absoluter/pfad/.env.worker [--apply]')
        print(json.dumps(prepare(Path(sys.argv[1]), len(sys.argv) == 3)))
    except Exception:
        print(json.dumps({'stage': 'blocked', 'reason': 'Private Datei oder vorhandene Mail-/Hosting-Zugänge prüfen. Nichts gestartet; keine Zugangsdaten ausgegeben.'}))
        sys.exit(1)
