// SPDX-License-Identifier: AGPL-3.0-only
// Inserted into Clawd main.js by the version-checked adapter.
const petExtraMedia = require('./clawd-extra-media')({
  now: () => Date.now(), dataDir: app.getPath('userData'),
  theme: () => getActiveTheme(),
  enabled: () => !isQuitting && getActiveTheme().petInteractions?.enabled === true && !doNotDisturb
    && !_mini.getMiniMode() && !_mini.getMiniTransitioning()
    && !!win && !win.isDestroyed() && win.isVisible(),
  muted: () => soundMuted, volume: () => soundVolume,
  send: payload => sendRawToRenderer('play-sound', payload),
  showImage: ({title, url}) => infoBubble.showImage(title, url),
});
const petPhysics = require('./clawd-physics-runtime')({
  enabled: () => !isQuitting && getActiveTheme().petInteractions?.enabled === true && !doNotDisturb
    && !_mini.getMiniMode() && !_mini.getMiniTransitioning()
    && !!win && !win.isDestroyed() && win.isVisible(),
  canFly: () => !menuOpen && !petWindowRuntime.isDragLocked()
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
    if (payload.sound) petExtraMedia.click();
    if (payload.kind === 'impact') petExtraMedia.impact();
  },
});
ipcMain.on('clawd-pet-gesture', (event, kind, data) => {
  if (!hitWin || hitWin.isDestroyed() || !isTrustedMainFrameEvent(event, hitWin.webContents)) return;
  if (!['press', 'release', 'tap', 'cancel', 'tickle', 'startle'].includes(kind)) return;
  const payload = data && typeof data === 'object' ? { slingshot: data.slingshot === true } : null;
  if (payload && kind === 'release' && Array.isArray(data.samples)) {
    const t = Date.now();
    payload.samples = data.samples.slice(-64).filter(p => p && [p.x, p.y, p.t].every(Number.isFinite)
      && Math.abs(p.x) <= 1000000 && Math.abs(p.y) <= 1000000 && p.t <= t && t - p.t <= 300)
      .map(p => ({x: p.x, y: p.y, t: p.t}));
    if (payload.samples.some((p, i, a) => i && p.t < a[i - 1].t)) payload.samples = [];
  }
  petPhysics.gesture(kind, payload);
});
app.on('before-quit', () => petPhysics.dispose());
