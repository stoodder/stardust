// The player's reduced-motion preference (art-direction §7), for the Phaser side. The media query
// is created once and read live, so views can check it every frame without a matchMedia call.
let query: MediaQueryList | null = null;

/** Whether the player asked for reduced motion (`prefers-reduced-motion: reduce`). */
export function prefersReducedMotion(): boolean {
  query ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return query.matches;
}

/** The period of every in-world blink and pulse (1 Hz; art-direction §7). */
export const PULSE_PERIOD_MS = 1000;

/**
 * Whether 1 Hz pulses are in their "on" half right now. Read from the page clock, so every
 * pulse on the canvas blinks in phase, and in phase with the HUD's CSS pulses (ui/hud/pulse.ts
 * starts those on the same clock).
 */
export function pulseOn(): boolean {
  return performance.now() % PULSE_PERIOD_MS < PULSE_PERIOD_MS / 2;
}
