// Projectiles are the brightest things on screen, each with a white core (art-direction §7).
import { defineSprite } from '../defineSprite.ts';

/** The Rivet's tracer: a 4×1 kinetic streak, warm tail to white head. Small enough to rotate. */
export const projectileRivetTracer = defineSprite({
  id: 'projectile.rivet_tracer',
  size: { w: 4, h: 1 },
  anchor: { x: 2, y: 0 },
  palette: 'everglow',
  // prettier-ignore
  frames: { e: ['deww'] },
});
