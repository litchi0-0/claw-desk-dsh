#!/usr/bin/env python3
"""Copy the packaged theme with a timestamped backup; never modify account settings."""
import argparse
import datetime
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = Path.home() / 'Library/Application Support/clawd-on-desk/themes/dsh-whale-chan'

def install(target):
    source = ROOT / 'themes/dsh-whale-chan'
    target = target.expanduser().resolve()
    if target == source.resolve():
        raise ValueError('Target must differ from repository theme')
    backup = None
    if target.exists():
        backup = target.with_name(target.name + '-backup-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
        shutil.copytree(target, backup)
    target.mkdir(parents=True, exist_ok=True)
    for name in ['theme.json', 'catalog.json', 'sources.json', 'README.md']:
        shutil.copy2(source / name, target / name)
    shutil.copytree(source / 'assets', target / 'assets', dirs_exist_ok=True)
    print('Theme installed:', target)
    if backup:
        print('Previous theme backup:', backup)
    print('Restart the animation app, then choose DSH 鲸鱼娘 in theme settings.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', type=Path, default=DEFAULT)
    install(parser.parse_args().target)
