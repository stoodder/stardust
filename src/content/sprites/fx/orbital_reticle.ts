import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows } from '../helpers.ts';

/** Orbital Strike radius, tiles (design/core-loop.md § Ability roster; Mk II bakes its own). */
const ORBITAL_RADIUS_TILES = 1.5;
// A grid-space circle of radius r is a 2:1 screen ellipse with semi-axes r·16√2 by r·8√2.
const RX = Math.round(ORBITAL_RADIUS_TILES * 16 * Math.SQRT2);
const RY = Math.round(ORBITAL_RADIUS_TILES * 8 * Math.SQRT2);

/** The targeting reticle: a dashed pixel ellipse whose dashes march, plus a center crosshair. */
function reticle(phase: 0 | 1): string[] {
  const w = 2 * RX + 1;
  const h = 2 * RY + 1;
  const g = grid(w, h);
  // Walk the ellipse in angle order, numbering each new pixel; dashes are 3 on, 3 off.
  const seen = new Set<string>();
  const samples = 720;
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * 2 * Math.PI;
    const x = Math.round(RX + RX * Math.cos(t));
    const y = Math.round(RY + RY * Math.sin(t));
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    if (Math.floor((seen.size + phase * 3) / 3) % 2 === 0) plot(g, x, y, 'd');
    seen.add(key);
  }
  // Corner ticks at the four cardinal points, and the crosshair.
  for (const [x, y] of [
    [0, RY],
    [2 * RX, RY],
    [RX, 0],
    [RX, 2 * RY],
  ] as const)
    plot(g, x, y, 'e');
  for (let d = 2; d <= 5; d++) {
    plot(g, RX + d * 2, RY, 'e');
    plot(g, RX - d * 2, RY, 'e');
    plot(g, RX, RY + d, 'e');
    plot(g, RX, RY - d, 'e');
  }
  plot(g, RX, RY, 'w');
  return rows(g);
}

/** Orbital Strike's 1 s targeting reticle, sized to the strike radius on the ground. */
export const fxOrbitalReticle = defineSprite({
  id: 'fx.orbital_reticle',
  size: { w: 2 * RX + 1, h: 2 * RY + 1 },
  anchor: { x: RX, y: RY },
  palette: 'everglow',
  outline: 'auto',
  frames: { march_0: reticle(0), march_1: reticle(1) },
  anims: { march: { frames: ['march_0', 'march_1'], fps: 6 } },
});
