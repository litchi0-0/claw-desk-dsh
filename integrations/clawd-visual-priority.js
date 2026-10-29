// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

module.exports = function resolveVisualPriority({options, manualPlayer, dragLocked, visual, physicsActive}) {
  if (options.dragReaction === true) {
    // A direct drag owns the pet immediately; never restore a stale clip between frames.
    manualPlayer.stop(false);
    return null;
  }
  if (physicsActive && options.physicsPlayback !== true && visual) return {request: visual};
  if (dragLocked && visual && visual.source === 'reaction' && options.source !== 'reaction') {
    return {request: visual};
  }
  if (manualPlayer.isActive() && options.manualPlayback !== true) {
    return {request: manualPlayer.getRequest()};
  }
  return null;
};
