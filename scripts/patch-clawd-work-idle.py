"""Patch Clawd 1.4.0's tick loop for optional work-driven idle animations."""
import sys
from pathlib import Path


def patch_tick(source):
    def change(before, after):
        nonlocal source
        if source.count(before) != 1:
            raise ValueError('Unsupported Clawd tick layout: ' + before[:80])
        source = source.replace(before, after, 1)

    change('let idleWasActive = false;', '''let workIdleSince = null;
let nextWorkIdleAnimationAt = null;
function usesWorkIdle() { return !!(theme && theme.idleTrigger === "work"); }
let idleWasActive = false;''')
    change('  theme = ctx.theme;', '''  theme = ctx.theme;
  workIdleSince = null;
  nextWorkIdleAnimationAt = null;''')
    change('function resetIdlePeriodForMouseMove() {', '''function resetIdlePeriodForMouseMove() {
  if (usesWorkIdle()) return;''')
    change('    // ── Idle state edge detection (must run every tick for timer cleanup) ──', '''    if (usesWorkIdle()) {
      // Follow real task activity, not cursor movement or a temporary visual pause.
      if (ctx.hasActiveWork === true) {
        workIdleSince = null;
        nextWorkIdleAnimationAt = null;
        idleLookPlayed = false;
      } else if (workIdleSince === null) {
        workIdleSince = Date.now();
        nextWorkIdleAnimationAt = workIdleSince + MOUSE_IDLE_TIMEOUT;
      }
    }
    // ── Idle state edge detection (must run every tick for timer cleanup) ──''')
    change('      const elapsed = Date.now() - mouseStillSince;', '''      const elapsed = Date.now() - (usesWorkIdle() ? (workIdleSince ?? Date.now()) : mouseStillSince);''')
    change('      if (ctx.startupRecoveryActive) {', '      if (ctx.startupRecoveryActive && !usesWorkIdle()) {')
    change('      if (!hasTriggeredYawn && elapsed >= MOUSE_SLEEP_TIMEOUT) {',
           '      if (!usesWorkIdle() && !hasTriggeredYawn && elapsed >= MOUSE_SLEEP_TIMEOUT) {')
    change('        && elapsed >= MOUSE_IDLE_TIMEOUT', '''        && (!usesWorkIdle() || (ctx.hasActiveWork !== true && !ctx.manualAnimationActive && !ctx.menuOpen && !ctx.dragLocked))
        && (usesWorkIdle() ? Date.now() >= nextWorkIdleAnimationAt : elapsed >= MOUSE_IDLE_TIMEOUT)''')
    change('        const pick = easterEgg || pool[Math.floor(random() * pool.length)];',
           '        const pick = easterEgg || (usesWorkIdle() && typeof ctx.chooseIdleAnimation === "function" ? ctx.chooseIdleAnimation(pool) : pool[Math.floor(random() * pool.length)]);')
    change('  const returnSvg = idleRestSvg();', '''  if (usesWorkIdle()) {
    idleLookPlayed = false;
    nextWorkIdleAnimationAt = Date.now() + MOUSE_IDLE_TIMEOUT;
  }
  const returnSvg = idleRestSvg();''')
    change('          if (isMouseIdle && ctx.currentState === "idle") {',
           '''          if (isMouseIdle && ctx.currentState === "idle"
            && (!usesWorkIdle() || (ctx.hasActiveWork !== true && !ctx.manualAnimationActive && !ctx.menuOpen && !ctx.dragLocked))) {''')
    change('          }\n        }, 250);', '''          } else if (usesWorkIdle()) {
            isMouseIdle = false;
            idleLookPlayed = false;
          }
        }, 250);''')
    change('      if (ctx.roam) ctx.roam.tick();',
           '      if (ctx.roam && (!usesWorkIdle() || !isMouseIdle)) ctx.roam.tick();')
    change('function cleanup() {', '''function cleanup() {
  workIdleSince = null;
  nextWorkIdleAnimationAt = null;''')
    return source


if __name__ == '__main__':
    print(patch_tick(Path(sys.argv[1]).read_text()), end='')
