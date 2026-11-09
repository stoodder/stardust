// Projectiles are the brightest things on screen, each with a white core (art-direction §7).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, plot, rows } from '../helpers.ts';

function shell(spin: 0 | 1): string[] {
  const g = grid(6, 6);
  disc(g, 3, 3, 3, (d, x, y) => (x + y < 5 ? '3' : d > 2.2 ? '0' : '1'));
  // The orange band, which rolls as the shell tumbles.
  for (let x = 0; x < 6; x++) plot(g, x, spin === 0 ? 3 : 2, x === 0 || x === 5 ? 'c' : 'd');
  plot(g, 2, 1, 'w');
  return rows(g);
}

/** The Thumper's shell: a round, banded mortar round, drawn in the `air` layer mid-arc. */
export const projectileThumperShell = defineSprite({
  id: 'projectile.thumper_shell',
  size: { w: 6, h: 6 },
  anchor: { x: 3, y: 3 },
  palette: 'everglow',
  outline: 'auto',
  frames: { spin_0: shell(0), spin_1: shell(1) },
  anims: { spin: { frames: ['spin_0', 'spin_1'], fps: 12 } },
});
