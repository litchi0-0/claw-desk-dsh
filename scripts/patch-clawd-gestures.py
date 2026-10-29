"""Add opt-in long-press tickle and second-press slingshot to native hit gestures."""
def patch_hit_gestures(source):
    def change(old, new):
        nonlocal source
        if source.count(old) != 1:
            raise ValueError('Unsupported hit gesture layout: ' + old[:70])
        source = source.replace(old, new, 1)
    change('// --- Pointer handlers ---', '''// Optional desktop-pet gestures; original shortcuts/click accumulator stay intact.
let lastPetRelease = -Infinity;
let physicsHoldTimer = null;
let physicsHoldTriggered = false;
let physicsModifiedPress = false;
function petGesture(kind, data) {
  if (tc.petInteractions && tc.petInteractions.enabled === true && window.hitAPI.physicsGesture) {
    window.hitAPI.physicsGesture(kind, data);
  }
}
function clearPetHold() {
  if (physicsHoldTimer !== null) { clearTimeout(physicsHoldTimer); physicsHoldTimer = null; }
}
// --- Pointer handlers ---''')
    change('    window.hitAPI.dragLock(true);', '''    physicsHoldTriggered = false;
    physicsModifiedPress = !!(e.metaKey || e.ctrlKey || e.shiftKey);
    const secondPress = !physicsModifiedPress && Date.now() - lastPetRelease < CLICK_WINDOW_MS;
    petGesture("press", { slingshot: secondPress });
    clearPetHold();
    if (!physicsModifiedPress) physicsHoldTimer = setTimeout(() => {
      physicsHoldTimer = null;
      if (isDragging && !didDrag && !dndEnabled && currentState === "idle") {
        physicsHoldTriggered = true;
        resetClickAccumulator();
        petGesture("tickle");
      }
    }, 700);
    window.hitAPI.dragLock(true);''')
    change('        didDrag = true;', '''        didDrag = true;
        clearPetHold();
        resetClickAccumulator();''')
    change('function stopDrag() {', 'function stopDrag(allowThrow = false) {')
    change('  clearQueuedDragMove();\n  isDragging = false;', '  clearQueuedDragMove();\n  clearPetHold();\n  isDragging = false;')
    change('  endDragReaction(didDrag);', '''  endDragReaction(didDrag);
  if (allowThrow !== true || physicsModifiedPress) petGesture("cancel");
  else petGesture(didDrag ? "release" : (physicsHoldTriggered ? "cancel" : "tap"));''')
    change('  stopDrag();\n  if (wasDrag) return;', '''  stopDrag(true);
  if (wasDrag || physicsHoldTriggered) { lastPetRelease = -Infinity; return; }
  lastPetRelease = Date.now();
  if (e.shiftKey && !e.metaKey && !e.ctrlKey && tc.petInteractions && tc.petInteractions.enabled === true) {
    resetClickAccumulator();
    petGesture("startle");
    return;
  }''')
    # Legacy/other themes must not swallow their long press as a new gesture.
    change('    if (!physicsModifiedPress) physicsHoldTimer',
           '    if (!physicsModifiedPress && tc.petInteractions && tc.petInteractions.enabled === true) physicsHoldTimer')
    return source
