"""Synchronize optional roam displacement with the committed source animation."""
import sys
from pathlib import Path

def patch_roam(source):
    def change(before, after):
        nonlocal source
        if source.count(before) != 1:
            raise ValueError('Unsupported Clawd roam layout: ' + before[:80])
        source = source.replace(before, after, 1)
    change('  let firstRoam = true;', '  let activeWalkToken = null;\n  let firstRoam = true;')
    change('  function cleanupTimers() {', '  function cleanupTimers() {\n    activeWalkToken = null;')
    change('    if (!enabled) return false;', '''    if (!enabled) return false;
    if (typeof ctx.isMovementPaused === "function" && ctx.isMovementPaused()) return false;''')
    change('    // ── Calculate duration based on distance (speed = 80px/s) ──', '''    const motionProfile = typeof ctx.getMotionProfile === "function" ? ctx.getMotionProfile() : null;
    // Keep ordinary steps proportional to character size. Recovery from an
    // out-of-bounds start retains its original target so containment still wins.
    if (motionProfile) {
      const area = ctx.getNearestWorkArea(startX + roamW / 2, startY + roamH / 2);
      const fence = target.fence;
      const inside = area && startX >= area.x && startY >= area.y
        && startX + roamW <= area.x + area.width && startY + roamH <= area.y + area.height
        && (!fence || (startX >= fence.left && startY >= fence.top
          && startX + roamW <= fence.right && startY + roamH <= fence.bottom));
      const distance = Math.hypot(finalX - startX, finalY - startY);
      const limit = require("./clawd-roam-motion").maxDistance(motionProfile, roamH);
      if (inside && distance > limit) {
        const ratio = limit / distance;
        finalX = startX + (finalX - startX) * ratio;
        finalY = startY + (finalY - startY) * ratio;
      }
    }
    // ── Calculate duration based on distance (speed = 80px/s) ──''')
    change('    const animDurationMs = Math.max(1000, dist / ROAM_SPEED_PX_PER_MS);',
           '    const animDurationMs = motionProfile ? motionProfile.durationMs : Math.max(1000, dist / ROAM_SPEED_PX_PER_MS);')
    change('''    if (typeof ctx.applyState === "function") {
      ctx.applyState("roam");
    }

    roamActive = true;
    const startTime = Date.now();''', '''    roamActive = true;
    const walkToken = {};
    activeWalkToken = walkToken;
    const requestedAt = Date.now();
    let startTime = motionProfile ? null : requestedAt;
    if (typeof ctx.applyState === "function") {
      if (motionProfile) {
        ctx.applyState("roam", motionProfile.file, {
          restartAnimation: true,
          onLogicalSettlement: (settlement) => {
            if (!roamActive || activeWalkToken !== walkToken || startTime !== null) return;
            if (settlement && settlement.status === "committed") startTime = Date.now();
            else cancelRoam();
          },
        });
      } else ctx.applyState("roam");
    }''')
    change('''      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / animDurationMs);
      const eased = t * (2 - t);''','''      if (motionProfile && startTime === null) {
        if (Date.now() - requestedAt >= 10000) { cancelRoam(); return; }
        roamAnimTimer = setTimeout(step, ROAM_FRAME_MS);
        return;
      }
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / animDurationMs);
      const eased = motionProfile ? require("./clawd-roam-motion").progress(motionProfile, elapsed) : t * (2 - t);''')
    return source

if __name__ == '__main__':
    print(patch_roam(Path(sys.argv[1]).read_text()), end='')
