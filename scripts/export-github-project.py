#!/usr/bin/env python3
"""Export only committed desktop-pet files to an empty cloned publication repository."""
import argparse
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def export(target):
    target = target.expanduser().resolve()
    if not (target / '.git').exists():
        raise ValueError('Clone the destination repository first')
    if any(p.name != '.git' for p in target.iterdir()):
        raise ValueError('Export target must contain only .git; existing files are never overwritten')
    files = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', '-z', 'HEAD'], cwd=ROOT).decode().split('\0')
    copied = 0
    for name in files:
        if not name:
            continue
        allowed = (name in {'.gitignore', 'README.md', 'LICENSE', 'ACKNOWLEDGEMENTS.md'}
            or name.startswith(('integrations/', 'scripts/', 'tests/', 'themes/dsh-whale-chan/', 'licenses/', '.github/workflows/'))
            or name.startswith(('docs/clawd-', 'docs/dsh-', 'docs/images/motion-'))
            or name == 'docs/plans/dsh-full-animation-menu.md')
        if name == 'docs/github-README.md':
            destination = target / 'README.md'
        elif allowed:
            destination = target / name
        else:
            continue
        data = subprocess.check_output(['git', 'show', 'HEAD:' + name], cwd=ROOT)
        if destination.suffix == '.md':
            data = data.replace(str(Path.home()).encode(), b'~')
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        copied += 1
    print('Exported committed pet project files:', copied)
    print('Source snapshot:', subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip())
    print('Destination:', target)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', required=True, type=Path)
    export(parser.parse_args().target)
