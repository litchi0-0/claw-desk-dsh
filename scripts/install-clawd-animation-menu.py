"""Create a separate, locally signed Clawd 1.4.0 app with a manual animation menu."""
import argparse
import copy
import hashlib
import json
import plistlib
import runpy
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path('/Applications/Clawd on Desk.app')
DEFAULT_TARGET = Path.home() / 'Applications/Clawd on Desk 动画版.app'


def read_archive(path):
    raw = path.read_bytes()
    sizes = struct.unpack('<4I', raw[:16])
    header_bytes = raw[16:16 + sizes[3]]
    return raw, json.loads(header_bytes), 8 + sizes[1], hashlib.sha256(header_bytes).hexdigest()


def leaf(header, name):
    node = header
    for part in name.split('/'):
        node = node['files'][part]
    return node


def read_file(raw, header, start, name):
    entry = leaf(header, name)
    pos = start + int(entry['offset'])
    return raw[pos:pos + entry['size']]


def replace_once(source, before, after):
    if source.count(before) != 1:
        raise ValueError('Unsupported Clawd source layout: ' + before[:80])
    return source.replace(before, after, 1)


def repack(raw, original, start, replacements):
    header = copy.deepcopy(original)
    for name in replacements:
        parts = name.split('/')
        parent = header
        for part in parts[:-1]:
            parent = parent['files'][part]
        parent['files'].setdefault(parts[-1], {})
    chunks = []
    offset = 0

    def walk(node, prefix=''):
        nonlocal offset
        for name, entry in node['files'].items():
            full = prefix + name
            if 'files' in entry:
                walk(entry, full + '/')
            elif not entry.get('unpacked') and 'link' not in entry:
                content = replacements.get(full)
                if content is None:
                    content = read_file(raw, original, start, full)
                entry['size'] = len(content)
                entry['offset'] = str(offset)
                if full in replacements:
                    block_size = 4 * 1024 * 1024
                    entry['integrity'] = {
                        'algorithm': 'SHA256', 'hash': hashlib.sha256(content).hexdigest(),
                        'blockSize': block_size,
                        'blocks': [hashlib.sha256(content[i:i + block_size]).hexdigest()
                                   for i in range(0, len(content), block_size)],
                    }
                chunks.append(content)
                offset += len(content)

    walk(header)
    encoded = json.dumps(header, ensure_ascii=False, separators=(',', ':')).encode()
    padded = encoded + b'\0' * (-len(encoded) % 4)
    packed = struct.pack('<4I', 4, len(padded) + 8, len(padded) + 4, len(encoded))
    return packed + padded + b''.join(chunks), hashlib.sha256(encoded).hexdigest()


def install(source, target):
    if target.exists():
        raise FileExistsError(f'Will not overwrite an existing app: {target}')
    asar = source / 'Contents/Resources/app.asar'
    raw, header, start, original_hash = read_archive(asar)
    package = json.loads(read_file(raw, header, start, 'package.json'))
    if package.get('version') != '1.4.0':
        raise ValueError('This adapter supports Clawd 1.4.0 only')
    info = plistlib.loads((source / 'Contents/Info.plist').read_bytes())
    expected = info['ElectronAsarIntegrity']['Resources/app.asar']['hash']
    if original_hash != expected:
        raise ValueError('Source archive header integrity mismatch')
    main = read_file(raw, header, start, 'src/main.js').decode()
    main = replace_once(main,
        'function requestDisplayedVisual(displayState, file, options = {}) {',
        '''const manualAnimationPlayer = require("./clawd-manual-playback")({
  cancelRoam: () => _roam.cancelRoam(),
  request: (file, options) => requestDisplayedVisual("idle", file, options),
  restore: () => {
    const state = _state.resolveDisplayState();
    _state.applyState(state, _state.getSvgOverride(state), { muteStateSounds: true });
  },
});

const pickIdleAnimation = require("./clawd-idle-picker")();
const infoBubble = require("./clawd-info-bubble")({
  snapshot: () => _state.buildSessionSnapshot(),
  sessions: () => _state.sessions,
  anchor: () => getHitRectScreen(getPetWindowBounds()),
  workArea: () => getBubbleWorkArea(true, getPetWindowBounds()),
  canShow: () => getActiveTheme().infoBubbles === true && !getAllBubblesHidden()
    && !doNotDisturb && !menuOpen && !_mini.getMiniMode() && !_mini.getMiniTransitioning()
    && !petWindowRuntime.isDragLocked() && !!win && !win.isDestroyed() && win.isVisible()
    && _perm.getVisibleBubbleBounds().length === 0,
});
app.on("before-quit", () => infoBubble.dispose());

const pollQuotaAnimation = require("./clawd-quota-animation").createWatcher({
  theme: () => getActiveTheme(),
  snapshot: () => _state.buildSessionSnapshot(),
  blocked: () => doNotDisturb || menuOpen || _mini.getMiniMode() || _mini.getMiniTransitioning()
    || petWindowRuntime.isDragLocked() || manualAnimationPlayer.isActive(),
  play: (file, durationMs) => manualAnimationPlayer.play(file, durationMs),
  notify: (row, durationMs) => infoBubble.showQuota(row, durationMs),
});

function requestDisplayedVisual(displayState, file, options = {}) {
  const visualSnapshot = displayedVisualProjection && displayedVisualProjection.getSnapshot();
  const heldVisual = require("./clawd-visual-priority")({
    options, manualPlayer: manualAnimationPlayer,
    dragLocked: petWindowRuntime.isDragLocked(),
    visual: visualSnapshot && (visualSnapshot.requested || visualSnapshot.committed),
  });
  if (heldVisual) return heldVisual.request;''')
    main = replace_once(main,
        '    deliver: (payload) => sendRawToRenderer("start-drag-reaction", payload, normalizedDirection),',
        '''    dragReaction: true,
    deliver: (payload) => sendRawToRenderer("start-drag-reaction", payload, normalizedDirection),''')
    main = replace_once(main,
        'return requestDisplayedVisual(_state.getCurrentState(), file, {\n    source: "reaction",\n    deliver: (payload) => sendRawToRenderer("play-click-reaction", payload, safeDuration),\n  });',
        'manualAnimationPlayer.play(file, safeDuration);\n  return manualAnimationPlayer.getRequest();')
    hit = read_file(raw, header, start, 'src/hit-renderer.js').decode()
    patch_hit = runpy.run_path(str(ROOT / 'scripts/patch-clawd-click.py'))['patch_hit']
    hit = patch_hit(hit)
    main = replace_once(main, 'const _menuCtx = {', '''const _menuCtx = {
  getQuotaAnimationMenu: () => require("./clawd-quota-animation").buildMenu(getActiveTheme(), {
    notify: (row, durationMs) => infoBubble.showQuota(row, durationMs),
    disabled: doNotDisturb || _mini.getMiniMode() || _mini.getMiniTransitioning(),
    snapshot: () => _state.buildSessionSnapshot(),
    play: (file, durationMs) => manualAnimationPlayer.play(file, durationMs),
  }),
  getAnimationMenu: () => require("./clawd-animation-menu")(getActiveTheme(), {
    disabled: doNotDisturb || _mini.getMiniMode() || _mini.getMiniTransitioning(),
    cancelRoam: () => _roam.cancelRoam(),
    play: (file, durationMs) => manualAnimationPlayer.play(file, durationMs),
    stop: () => manualAnimationPlayer.stop(),
  }),''')
    main = replace_once(main, 'const _tickCtx = {', '''const _tickCtx = {
  pollQuotaAnimation: () => { pollQuotaAnimation(); infoBubble.poll(); },
  chooseIdleAnimation: (pool) => pickIdleAnimation(pool, getActiveTheme()),
  get hasActiveWork() { return anySessionInProgress(); },
  get manualAnimationActive() { return manualAnimationPlayer.isActive(); },''')
    tick = read_file(raw, header, start, 'src/tick.js').decode()
    patch_tick = runpy.run_path(str(ROOT / 'scripts/patch-clawd-work-idle.py'))['patch_tick']
    tick = patch_tick(tick)
    tick = replace_once(tick, 'function runMainTickOnce() {',
        'function runMainTickOnce() {\n  if (ctx.pollQuotaAnimation) ctx.pollQuotaAnimation();')
    main = replace_once(main,
        '  getSleepTimeoutMs: () => getActiveTheme().timings.mouseSleepTimeout,',
        '  getSleepTimeoutMs: () => getActiveTheme().idleTrigger === "work" ? Infinity : getActiveTheme().timings.mouseSleepTimeout,')
    main = replace_once(main, 'const _roamCtx = {', '''const _roamCtx = {
  getMotionProfile: () => require("./clawd-roam-motion").getProfile(getActiveTheme()),
  isMovementPaused: () => manualAnimationPlayer.isActive() || menuOpen || !!(_tick && _tick.idleAnimationActive),''')
    roam = read_file(raw, header, start, 'src/roam.js').decode()
    patch_roam = runpy.run_path(str(ROOT / 'scripts/patch-clawd-roam.py'))['patch_roam']
    roam = patch_roam(roam)
    state = read_file(raw, header, start, 'src/state.js').decode()
    state = replace_once(state,
        'ctx.sendToRenderer("state-change", state, svg, { restartAnimation: true });',
        'ctx.sendToRenderer("state-change", state, svg, { restartAnimation: true, onLogicalSettlement: applyOptions.onLogicalSettlement });')
    menu = read_file(raw, header, start, 'src/menu.js').decode()
    marker = '  function buildContextMenu() {'
    if menu.count(marker) != 1:
        raise ValueError('Unsupported context menu layout')
    before_context, context = menu.split(marker)
    context = replace_once(context, '    const workGroup = [', '''    const animationMenu = typeof ctx.getAnimationMenu === "function" ? ctx.getAnimationMenu() : null;
    if (animationMenu) stateGroup.push(animationMenu);
    const quotaAnimationMenu = typeof ctx.getQuotaAnimationMenu === "function" ? ctx.getQuotaAnimationMenu() : null;
    if (quotaAnimationMenu) stateGroup.push(quotaAnimationMenu);

    const workGroup = [''')
    menu = before_context + marker + context
    replacements = {
        'src/main.js': main.encode(), 'src/menu.js': menu.encode(), 'src/tick.js': tick.encode(),
        'src/hit-renderer.js': hit.encode(),
        'src/roam.js': roam.encode(), 'src/state.js': state.encode(),
        'src/clawd-roam-motion.js': (ROOT / 'integrations/clawd-roam-motion.js').read_bytes(),
        'src/clawd-idle-picker.js': (ROOT / 'integrations/clawd-idle-picker.js').read_bytes(),
        'src/clawd-info-content.js': (ROOT / 'integrations/clawd-info-content.js').read_bytes(),
        'src/clawd-info-bubble.js': (ROOT / 'integrations/clawd-info-bubble.js').read_bytes(),
        'src/clawd-info-preload.js': (ROOT / 'integrations/clawd-info-preload.js').read_bytes(),
        'src/clawd-info-bubble.html': (ROOT / 'integrations/clawd-info-bubble.html').read_bytes(),
        'src/clawd-quota-animation.js': (ROOT / 'integrations/clawd-quota-animation.js').read_bytes(),
        'src/clawd-animation-menu.js': (ROOT / 'integrations/clawd-animation-menu.js').read_bytes(),
        'src/clawd-manual-playback.js': (ROOT / 'integrations/clawd-manual-playback.js').read_bytes(),
        'src/clawd-visual-priority.js': (ROOT / 'integrations/clawd-visual-priority.js').read_bytes(),
    }
    patch_interactions = runpy.run_path(str(ROOT / 'scripts/patch-clawd-interactions.py'))['patch_interactions']
    replacements.update(patch_interactions(main, hit, lambda name: read_file(raw, header, start, name)))
    archive, new_hash = repack(raw, header, start, replacements)
    with tempfile.TemporaryDirectory(prefix='clawd-animation-menu-') as tmp:
        stage = Path(tmp) / target.name
        shutil.copytree(source, stage, symlinks=True)
        (stage / 'Contents/Resources/app.asar').write_bytes(archive)
        info['CFBundleIdentifier'] = 'com.clawd.on-desk.animation-menu'
        info['CFBundleDisplayName'] = 'Clawd on Desk 动画版'
        # Electron locates its Helper apps using CFBundleName; retain it.
        info['ElectronAsarIntegrity']['Resources/app.asar']['hash'] = new_hash
        (stage / 'Contents/Info.plist').write_bytes(plistlib.dumps(info))
        # Reuse the original app's runtime entitlements for this local build.
        original_entitlements = subprocess.run(
            ['codesign', '-d', '--entitlements', ':-', str(source)],
            check=True, capture_output=True).stdout
        entitlements = Path(tmp) / 'entitlements.plist'
        plistlib.loads(original_entitlements)
        entitlements.write_bytes(original_entitlements)
        subprocess.run(['codesign', '--force', '--deep', '--sign', '-', '--entitlements',
                        str(entitlements), str(stage)], check=True)
        subprocess.run(['codesign', '--verify', '--deep', '--strict', str(stage)], check=True)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(stage), str(target))
    check_raw, check_header, check_start, check_hash = read_archive(target / 'Contents/Resources/app.asar')
    assert check_hash == new_hash
    for name, content in replacements.items():
        assert read_file(check_raw, check_header, check_start, name) == content
    print('Installed local animation-menu app:', target)
    print('Original app preserved:', source)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--target', type=Path, default=DEFAULT_TARGET)
    args = parser.parse_args()
    install(args.source, args.target)
