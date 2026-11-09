// The player's reduced-motion preference (art-direction §7), for the DOM overlay. The media query
// is created once and read live, so components can check it without a matchMedia call each time.
// (render/motion.ts is the Phaser side's copy: ui/ may not import render/.)
let query: MediaQueryList | null = null;

/** Whether the player asked for reduced motion (`prefers-reduced-motion: reduce`). */
export function prefersReducedMotion(): boolean {
  query ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return query.matches;
}
