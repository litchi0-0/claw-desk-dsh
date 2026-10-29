// SPDX-License-Identifier: AGPL-3.0-only
// Inserted into Clawd main.js by the version-checked adapter.
let lastPetClickSoundAt = 0;
const petPhysics = require('./clawd-physics-runtime')({
  enabled: () => !isQuitting && getActiveTheme().petInteractions?.enabled === true && !doNotDisturb
    && !_mini.getMiniMode() && !_mini.getMiniTransitioning()
    && !!win && !win.isDestroyed() && win.isVisible(),
  canFly: () => !anySessionInProgress() && !menuOpen && !petWindowRuntime.isDragLocked()
    && !_perm.hasVisiblePermissionBubbles(),
  canReact: () => !anySessionInProgress() && !menuOpen
    && ['idle', 'roam'].includes(_state.getCurrentState()) && !_perm.hasVisiblePermissionBubbles(),
  canStartle: () => !manualAnimationPlayer.isActive(),
  cursor: () => screen.getCursorScreenPoint(),
  bounds: () => getPetWindowBounds(),
  hitRect: () => getHitRectScreen(getPetWindowBounds()),
  limits: (bounds) => {
    const hit = getHitRectScreen(bounds);
    const area = getNearestWorkArea((hit.left + hit.right) / 2, (hit.top + hit.bottom) / 2);
    return area ? require('./clawd-physics').collisionBounds(area, bounds, hit) : null;
  },
  apply: (bounds) => {
    applyPetWindowBounds(bounds);
    syncHitWin();
    syncDisplayedVisualGeometry();
    repositionAnchoredFloatingSurfaces();
  },
  beforeFlight: () => { manualAnimationPlayer.stop(false); _roam.cancelRoam(); },
  showAir: () => requestDisplayedVisual(_state.getCurrentState(), getActiveTheme().reactions.drag.file, {
    source: 'reaction', physicsPlayback: true, restartAnimation: true,
  }),
  restore: () => {
    const state = _state.resolveDisplayState();
    _state.applyState(state, _state.getSvgOverride(state), { muteStateSounds: true });
  },
  afterFlight: () => {
    petWindowRuntime.releaseReconcileProtection();
    if (win && !win.isDestroyed()) flushRuntimeStateToPrefs();
  },
  reaction: (name) => {
    const file = name === 'tickle' ? 'dianji-huiying-naoyang-gegexiao.webp' : 'beixiayitiao-zhamao.webp';
    const entry = getActiveTheme().manualAnimations?.find(a => a.file === file);
    if (entry) manualAnimationPlayer.play(entry.file, entry.duration);
  },
  feedback: (payload) => {
    sendRawToRenderer('clawd-pet-feedback', payload);
    if (payload.sound && !soundMuted && !doNotDisturb && getActiveTheme().petInteractions?.clickSound !== false
        && Date.now() - lastPetClickSoundAt >= 65) {
      lastPetClickSoundAt = Date.now();
      sendRawToRenderer('play-sound', {
        url: require('url').pathToFileURL(path.join(__dirname, 'clawd-click.wav')).href,
        volume: soundVolume * .35,
      });
    }
  },
});
ipcMain.on('clawd-pet-gesture', (event, kind, data) => {
  if (!hitWin || hitWin.isDestroyed() || !isTrustedMainFrameEvent(event, hitWin.webContents)) return;
  if (!['press', 'release', 'tap', 'cancel', 'tickle', 'startle'].includes(kind)) return;
  petPhysics.gesture(kind, data && typeof data === 'object' ? { slingshot: data.slingshot === true } : null);
});
app.on('before-quit', () => petPhysics.dispose());
