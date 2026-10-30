"""Restore selected, pinned media only; never download or execute the reference app."""
import argparse
import concurrent.futures
import hashlib
import json
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'integrations/merzlin-media'

def restore(git_cache=None):
    catalog_path = DEST / 'catalog.json'
    catalog = json.loads(catalog_path.read_text())
    def fetch(item):
        target = DEST / item['file']
        if target.exists():
            data = target.read_bytes()
            sha = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
            if sha == item['sourceGitBlobSha']:
                return item, data
        if git_cache:
            data = subprocess.check_output(['git', '-c', 'core.sshCommand=ssh -p 443 -o HostKeyAlias=github.com -o Hostname=ssh.github.com -o ConnectTimeout=10',
                '--git-dir=' + str(git_cache), 'show', catalog['revision'] + ':' + item['sourcePath']])
        else:
            url = 'https://raw.githubusercontent.com/MerZlin/dsh-pet-indesktop/' + catalog['revision'] + '/' + urllib.parse.quote(item['sourcePath'])
            with urllib.request.urlopen(url, timeout=30) as response:
                data = response.read()
        actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        if actual != item['sourceGitBlobSha']:
            raise ValueError('Upstream Git blob mismatch: ' + item['sourcePath'])
        return item, data
    items = catalog['images'] + catalog['sounds']
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as workers:
        for item, data in workers.map(fetch, items):
            (DEST / item['file']).write_bytes(data)
            item['sha256'] = hashlib.sha256(data).hexdigest()
            item['bytes'] = len(data)
            print(item['file'], len(data), flush=True)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--git-cache', type=Path)
    restore(parser.parse_args().git_cache)
