"""Build a Clawd theme from pinned dsh-pet media; never execute upstream code."""
import hashlib
import runpy
import argparse
import json
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'themes' / 'dsh-whale-chan'
CATALOG = json.loads((OUT / 'catalog.json').read_text())
REV = CATALOG['revision']
ENCODING = {'fps': 24, 'size': [480, 270], 'quality': 85, 'alphaCutoff': 3, 'version': 2}
IDLE_SOURCES = {
    'look-around': '东张西望', 'snack': '大口吃零食',
    'ice-cream': '吃冰淇淋融化', 'watermelon': '吃西瓜',
    'violin': '小提琴演奏', 'flute': '吹笛子',
    'card-magic': '扑克魔术', 'dance': '可爱宅舞',
    'balloon': '吹气球', 'mirror': '照镜子',
    'stretch': '超大伸懒腰', 'game': '玩游戏气急败坏',
    'toy-car': '原地蹲下玩玩具汽车', 'fan': '摇扇纳凉',
    'humming': '悠闲哼歌', 'gift': '拆礼物',
}
IDLE_KEYS = ['cube', 'hotpot', 'cat', 'yawning', *IDLE_SOURCES]
SOURCES = {entry['id']: Path(entry['source']).stem for entry in CATALOG['assets']}
CATALOG_BY_ID = {entry['id']: entry for entry in CATALOG['assets']}


def download(url):
    cache = Path(tempfile.gettempdir()) / 'dsh-pet-media' / REV
    cache.mkdir(parents=True, exist_ok=True)
    target = cache / (hashlib.sha256(url.encode()).hexdigest() + '.webm')
    if not target.is_file():
        partial = target.with_suffix('.part')
        mirror = url.replace('https://raw.githubusercontent.com/PC2005-cloud/dsh-pet/' + REV + '/',
                             'https://cdn.jsdelivr.net/gh/PC2005-cloud/dsh-pet@' + REV + '/')
        for candidate in [mirror, url]:
            try:
                with urllib.request.urlopen(candidate, timeout=20) as response:
                    partial.write_bytes(response.read())
                break
            except OSError:
                continue
        else:
            subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error',
                            '--retry', '1', '--connect-timeout', '10', '--max-time', '30',
                            url, '-o', str(partial)], check=True)
        partial.replace(target)
    return target.read_bytes()


def build():
    assets = OUT / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    manifest_path = OUT / 'sources.json'
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    manifest = previous.get('assets', {}).copy()
    theme_path = OUT / 'theme.json'
    previous_theme = json.loads(theme_path.read_text()) if theme_path.exists() else None
    boxes = []
    for key, source in SOURCES.items():
        url = 'https://raw.githubusercontent.com/PC2005-cloud/dsh-pet/' + REV + '/' + urllib.parse.quote('dsh-pet/assets/webm/' + source + '.webm')
        destination = assets / (key + '.webp')
        metadata = manifest.get(key, {})
        if (metadata.get('sourceGitBlobSha') == CATALOG_BY_ID[key]['sourceGitBlobSha']
                and metadata.get('encoding') == ENCODING
                and destination.is_file()
                and hashlib.sha256(destination.read_bytes()).hexdigest() == metadata.get('outputSha256')):
            with Image.open(destination) as existing:
                for index in range(existing.n_frames):
                    existing.seek(index)
                    box = existing.convert('RGBA').getchannel('A').getbbox()
                    if box: boxes.append(box)
            print(key, 'verified cached output', flush=True)
            continue
        data = download(url)
        blob_sha = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        if blob_sha != CATALOG_BY_ID[key]['sourceGitBlobSha']:
            raise ValueError('Upstream Git blob mismatch: ' + source)
        # libvpx-vp9 is essential: the default native VP9 decoder loses alpha.
        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp) / 'source.webm'
            video.write_bytes(data)
            result = subprocess.run([
                ffmpeg, '-v', 'error', '-c:v', 'libvpx-vp9', '-i', str(video),
                '-vf', 'fps=24,scale=480:270:flags=lanczos', '-pix_fmt', 'rgba',
                '-f', 'rawvideo', 'pipe:1',
            ], check=True, capture_output=True)
        frame_size = 480 * 270 * 4
        raw = result.stdout
        if not raw or len(raw) % frame_size:
            raise ValueError('Invalid decoded frame data: ' + source)
        frames = [Image.frombytes('RGBA', (480, 270), raw[i:i + frame_size])
                  for i in range(0, len(raw), frame_size)]
        for frame in frames:
            alpha = frame.getchannel('A')
            # VP9 leaves near-invisible alpha=1 speckles across the canvas.
            # Remove only that noise so content bounds and click areas stay useful.
            alpha = alpha.point(lambda value: 0 if value <= 3 else value)
            frame.putalpha(alpha)
            if alpha.getextrema()[0] != 0:
                raise ValueError('Missing alpha: ' + source)
            if alpha.getbbox(): boxes.append(alpha.getbbox())
        durations = [round((i + 1) * 1000 / ENCODING['fps']) - round(i * 1000 / ENCODING['fps'])
                     for i in range(len(frames))]
        frames[0].save(destination, save_all=True, append_images=frames[1:],
                       duration=durations,
                       loop=0, quality=85, method=4)
        with Image.open(destination) as encoded:
            stored_frames = encoded.n_frames
        manifest[key] = {'source': source + '.webm', 'url': url,
                         'sourceSha256': hashlib.sha256(data).hexdigest(), 'sourceGitBlobSha': blob_sha,
                         'outputSha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
                         'frames': stored_frames, 'sourceFrames': len(frames),
                         'durationMs': sum(durations), 'encoding': ENCODING.copy()}
        # Persist completed conversions so an interrupted download can resume.
        manifest_path.write_text(json.dumps({'repository': 'https://github.com/PC2005-cloud/dsh-pet',
            'revision': REV, 'assets': manifest}, ensure_ascii=False, indent=2) + '\n')
        print(key, len(frames), destination.stat().st_size, flush=True)
    def file(key):
        return key + '.webp'
    def reaction(key):
        return {'file': file(key), 'duration': manifest[key]['durationMs']}
    # Shared source canvas keeps the feet and apparent scale stable across states.
    box = [min(b[0] for b in boxes), min(b[1] for b in boxes),
           max(b[2] for b in boxes), max(b[3] for b in boxes)]
    content = {'x': box[0], 'y': box[1], 'width': box[2]-box[0], 'height': box[3]-box[1]}
    theme = {
        'schemaVersion': 1, 'name': {'en': 'DSH Whale-chan', 'zh': 'DSH 鲸鱼娘'},
        'version': '1.3.1', 'author': 'PC2005-cloud/dsh-pet; local Clawd adaptation',
        'idleTrigger': 'work',
        'roamFlipAssets': True,
        'license': 'CC BY-NC-SA 4.0 (assets; non-commercial)',
        'description': {'zh': 'DSH 大肥鱼动画适配；非官方、非商业同人主题。'},
        'customization': {'petTint': False},
        'viewBox': {'x': 0, 'y': 0, 'width': 480, 'height': 270},
        'layout': {'contentBox': content, 'centerX': 240, 'baselineY': box[3],
                   'visibleHeightRatio': 0.58, 'baselineBottomRatio': 0.05},
        'eyeTracking': {'enabled': False, 'states': []},
        'sleepSequence': {'mode': 'direct'},
        'states': {state: [file(asset)] for state, asset in {
            'idle': 'idle', 'thinking': 'thinking', 'working': 'working',
            'juggling': 'juggling', 'attention': 'done', 'notification': 'waiting',
            'error': 'error', 'sweeping': 'organizing', 'carrying': 'busy',
            'sleeping': 'sleeping', 'roam': 'walk',
        }.items()},
        'workingTiers': [{'minSessions': 2, 'file': file('busy')},
                         {'minSessions': 1, 'file': file('working')}],
        'displayHintMap': {
            'clawd-working-building.svg': file('busy'),
            'clawd-working-typing.svg': file('working'),
            'clawd-working-juggling.svg': file('juggling'),
            'clawd-working-conducting.svg': file('juggling'),
            'clawd-working-thinking.svg': file('thinking'),
        },
        'idleAnimations': [{'file': file(k), 'duration': manifest[k]['durationMs']}
                           for k in IDLE_KEYS],
        'manualAnimations': [{'file': file(a['id']), 'label': a['label'], 'category': a['category'],
                              'duration': manifest[a['id']]['durationMs']} for a in CATALOG['assets']],
        'idleVisualOptions': [{'file': file(a['id'])} for a in CATALOG['assets']],
        'hitBoxes': {'default': {'x': box[0], 'y': box[1], 'w': content['width'], 'h': content['height']}},
        'reactions': {'drag': {'file': file('drag')}, 'clickLeft': reaction('wave'),
                      'clickRight': reaction('shy'), 'annoyed': reaction('annoyed'),
                      'double': {'files': [file('happy')], 'duration': manifest['happy']['durationMs']}},
        'miniMode': {'supported': False},
    }
    if previous_theme:
        # Additional props must not rescale or shift the existing pet.
        theme['layout'] = previous_theme['layout']
        theme['hitBoxes'] = previous_theme['hitBoxes']
    theme = runpy.run_path(str(ROOT / 'scripts/configure-dsh-auto-idle.py'))['configure_theme'](theme)
    (OUT / 'theme.json').write_text(json.dumps(theme, ensure_ascii=False, indent=2) + '\n')
    (OUT / 'sources.json').write_text(json.dumps({'repository': 'https://github.com/PC2005-cloud/dsh-pet',
        'revision': REV, 'assets': manifest}, ensure_ascii=False, indent=2) + '\n')


def normalize_existing():
    """Clean alpha noise in already converted files without another download."""
    manifest = json.loads((OUT / 'sources.json').read_text())
    for key, metadata in manifest['assets'].items():
        target = OUT / 'assets' / (key + '.webp')
        frames, durations = [], []
        changed = False
        with Image.open(target) as animation:
            for index in range(animation.n_frames):
                animation.seek(index)
                frame = animation.convert('RGBA')
                alpha = frame.getchannel('A')
                clean = alpha.point(lambda value: 0 if value <= 3 else value)
                changed |= alpha.tobytes() != clean.tobytes()
                frame.putalpha(clean)
                frames.append(frame)
                durations.append(animation.info.get('duration', 67))
        if changed:
            # Lossless re-encoding preserves the previously encoded RGB values.
            frames[0].save(target, save_all=True, append_images=frames[1:],
                           duration=durations, loop=0, lossless=True, method=4)
        metadata['outputSha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
    theme_path = OUT / 'theme.json'
    theme = json.loads(theme_path.read_text())
    theme['version'] = '1.3.1'
    theme['idleTrigger'] = 'work'
    theme['roamFlipAssets'] = True
    # Keep the authored layout: broad effects must not resize the character.
    theme = runpy.run_path(str(ROOT / 'scripts/configure-dsh-auto-idle.py'))['configure_theme'](theme)
    theme_path.write_text(json.dumps(theme, ensure_ascii=False, indent=2) + '\n')
    (OUT / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--normalize-existing', action='store_true')
    args = parser.parse_args()
    if args.normalize_existing:
        normalize_existing()
    else:
        build()
