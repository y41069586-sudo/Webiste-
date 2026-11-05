#!/usr/bin/env python3
"""Stage only committed core source, readable by the unprivileged container; never chmod the checkout."""
import argparse
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile


def stage_source(repo: Path, release: str, destination: Path) -> None:
    if not re.fullmatch(r'[a-f0-9]{40}', release):
        raise ValueError('Vollständiger Release-Commit erforderlich.')
    if destination.is_symlink() or not destination.is_dir() or any(destination.iterdir()):
        raise ValueError('Neue, leere Snapshot-Ablage erforderlich.')
    destination = destination.resolve()
    process = subprocess.Popen(
        ['git', '-C', str(repo), 'archive', '--format=tar', release,
         'packages/core/src', 'packages/core/scripts'],
        stdout=subprocess.PIPE,
    )
    try:
        with tarfile.open(fileobj=process.stdout, mode='r|') as archive:
            for member in archive:
                relative = PurePosixPath(member.name)
                if relative.is_absolute() or '..' in relative.parts:
                    raise ValueError('Ungültiger Archivpfad.')
                # Parent directory records are permitted; all actual files must stay in the two scopes.
                allowed = any(relative.parts[:3] == ('packages', 'core', part) for part in ['src', 'scripts'])
                parent = member.isdir() and relative.parts in [('packages',), ('packages', 'core')]
                if not (allowed or parent) or any(part.startswith('.env') for part in relative.parts):
                    raise ValueError('Datei außerhalb des freigegebenen Quellcode-Bereichs.')
                if not member.isdir() and not member.isfile():
                    raise ValueError('Links oder Spezialdateien im Quellcode-Snapshot nicht erlaubt.')
                target = destination.joinpath(*relative.parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                if member.isdir():
                    target.mkdir(exist_ok=True)
                else:
                    source = archive.extractfile(member)
                    if source is None:
                        raise ValueError('Archivdatei nicht lesbar.')
                    with target.open('xb') as output:
                        while chunk := source.read(1024 * 1024):
                            output.write(chunk)
                    target.chmod(0o755 if member.mode & 0o111 else 0o644)
        if process.wait() != 0:
            raise RuntimeError('Git-Archiv konnte nicht erstellt werden.')
        for directory, dirs, _ in os.walk(destination):
            # Keep the temporary top directory private on the host. Its two child roots are bind-mounted.
            if Path(directory) != destination:
                Path(directory).chmod(0o755)
        for part in ['src', 'scripts']:
            if not (destination / 'packages/core' / part).is_dir():
                raise ValueError('Quellcode-Snapshot unvollständig.')
    finally:
        if process.stdout:
            process.stdout.close()
        if process.poll() is None:
            process.terminate()
            process.wait()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--release', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    stage_source(args.repo, args.release, args.output)
