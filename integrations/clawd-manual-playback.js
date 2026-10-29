// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

module.exports = function createManualPlayback(controls) {
  const schedule = controls.setTimeout || setTimeout;
  const clear = controls.clearTimeout || clearTimeout;
  let active = null;

  function stop(restore = true) {
    if (!active) return;
    const previous = active;
    active = null;
    clear(previous.timer);
    if (restore) controls.restore();
  }

  function play(file, durationMs) {
    stop(false);
    controls.cancelRoam();
    const playback = {file, request: null, timer: null, committed: false};
    active = playback;
    const duration = Math.max(1, Math.min(60000, durationMs));
    playback.timer = schedule(() => {
      if (active === playback) stop();
    }, 30000); // broken image loads must not hold the state forever
    try {
      playback.request = controls.request(file, {
        manualPlayback: true,
        restartAnimation: true,
        source: 'idle-animation',
        onLogicalSettlement: settlement => {
          if (active !== playback || playback.committed) return;
          clear(playback.timer);
          if (!settlement || settlement.status !== 'committed') {
            stop();
            return;
          }
          playback.committed = true;
          playback.timer = schedule(() => {
            if (active === playback) stop();
          }, duration);
        },
      });
      if (!playback.request && active === playback) stop();
    } catch (error) {
      stop();
      throw error;
    }
  }

  return {
    play, stop,
    isActive: () => active !== null,
    getRequest: () => active ? active.request : null,
  };
};
