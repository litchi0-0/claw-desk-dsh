"""Version-specific wiring for bounded physics, native gestures and visual feedback."""
from pathlib import Path
import runpy
ROOT = Path(__file__).resolve().parents[1]

def patch_interactions(main, hit, read):
    def replace(source, old, new):
        if source.count(old) != 1:
            raise ValueError('Unsupported interaction source layout: ' + old[:75])
        return source.replace(old, new, 1)
    integration = (ROOT / 'integrations/clawd-interaction-main.js').read_text()
    main = replace(main, 'const infoBubble = require("./clawd-info-bubble")({', integration + '\nconst infoBubble = require("./clawd-info-bubble")({')
    main = replace(main, 'function requestDisplayedVisual(displayState, file, options = {}) {', '''function requestDisplayedVisual(displayState, file, options = {}) {
  if (petPhysics.isActive() && options.manualPlayback === true) petPhysics.cancel(false);''')
    main = replace(main, '    options, manualPlayer: manualAnimationPlayer,', '    options, manualPlayer: manualAnimationPlayer, physicsActive: petPhysics.isActive(),')
    main = replace(main, 'isRoamAnimating: () => _roam.isRoamAnimating(),', 'isRoamAnimating: () => _roam.isRoamAnimating() || petPhysics.isActive(),')
    main = replace(main, 'pollQuotaAnimation: () => { pollQuotaAnimation(); infoBubble.poll(); },', 'pollQuotaAnimation: () => { petPhysics.poll(); pollQuotaAnimation(); infoBubble.poll(); },')
    main = replace(main, 'get manualAnimationActive() { return manualAnimationPlayer.isActive(); },', 'get manualAnimationActive() { return manualAnimationPlayer.isActive() || petPhysics.isActive(); },')
    main = replace(main, 'isMovementPaused: () => manualAnimationPlayer.isActive() || menuOpen || !!(_tick && _tick.idleAnimationActive),', 'isMovementPaused: () => petPhysics.isActive() || manualAnimationPlayer.isActive() || menuOpen || !!(_tick && _tick.idleAnimationActive),')
    main = replace(main, '|| petWindowRuntime.isDragLocked() || manualAnimationPlayer.isActive(),', '|| petWindowRuntime.isDragLocked() || manualAnimationPlayer.isActive() || petPhysics.isActive(),')
    main = replace(main, '&& !petWindowRuntime.isDragLocked() && !!win', '&& !petPhysics.isActive() && !petWindowRuntime.isDragLocked() && !!win')
    main = replace(main, 'moveWindowForDrag: () => moveWindowForDrag(),', '''moveWindowForDrag: () => {
      if (!petPhysics.isSlingshot()) moveWindowForDrag();
      petPhysics.track();
    },''')
    hit = runpy.run_path(str(ROOT / 'scripts/patch-clawd-gestures.py'))['patch_hit_gestures'](hit)
    preload_hit = replace(read('src/preload-hit.js').decode(), '  // Theme config push', '''  physicsGesture: (kind, data) => ipcRenderer.send("clawd-pet-gesture", kind, data),
  // Theme config push''')
    preload = replace(read('src/preload.js').decode(), 'contextBridge.exposeInMainWorld("electronAPI", {', '''contextBridge.exposeInMainWorld("electronAPI", {
  onPetFeedback: (cb) => ipcRenderer.on("clawd-pet-feedback", (_, payload) => cb(payload)),''')
    html = replace(read('src/index.html').decode(), '  <script src="renderer.js"></script>', '  <script src="renderer.js"></script>\n  <script src="clawd-feedback-renderer.js"></script>')
    theme_context = replace(read('src/theme-context.js').decode(), '      reactions: theme.reactions || {},', '      reactions: theme.reactions || {},\n      petInteractions: theme.petInteractions || null,')
    result = {'src/main.js': main.encode(), 'src/hit-renderer.js': hit.encode(), 'src/preload-hit.js': preload_hit.encode(),
              'src/preload.js': preload.encode(), 'src/index.html': html.encode(), 'src/theme-context.js': theme_context.encode()}
    for name in ['clawd-physics.js', 'clawd-physics-runtime.js', 'clawd-feedback-renderer.js', 'dsh-click-duck.wav']:
        result['src/' + name] = (ROOT / 'integrations' / name).read_bytes()
    return result
