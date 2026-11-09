// Keeps the HUD's 1 Hz pulses in phase with each other and with the canvas's teach pulses
// (render/motion.ts `pulseOn`): every `hud-pulse` animation is started at the document
// timeline's zero, so its phase is the page clock's, whenever its class was added.
const PULSE_ANIMATIONS: ReadonlySet<string> = new Set(['hud-pulse']);

const isCssAnimation = (a: Animation): a is CSSAnimation => 'animationName' in a;

/** A ref callback for an element that may carry a 1 Hz pulse class. */
export function alignPulse(el: Element | null): void {
  if (el === null || typeof el.getAnimations !== 'function') return;
  for (const a of el.getAnimations()) {
    if (isCssAnimation(a) && PULSE_ANIMATIONS.has(a.animationName) && a.startTime !== 0) {
      a.startTime = 0;
    }
  }
}
