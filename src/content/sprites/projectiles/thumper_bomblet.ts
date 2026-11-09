// Cluster Thumper's bomblet (design/towers.md § 7): a small orange ball with a white glint, flung
// from the shell's burst. Like every projectile it has a white core (art-direction §7).
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows } from '../helpers.ts';

function bomblet(spin: 0 | 1): string[] {
  const g = grid(4, 4);
  for (const [x, y] of [
    [1, 0],
    [2, 0],
    [0, 1],
    [3, 1],
    [0, 2],
    [3, 2],
    [1, 3],
    [2, 3],
  ] as const) {
    plot(g, x, y, 'c');
  }
  plot(g, 1, 1, spin === 0 ? 'w' : 'e');
  plot(g, 2, 1, 'd');
  plot(g, 1, 2, 'd');
  plot(g, 2, 2, spin === 0 ? 'b' : 'w');
  return rows(g);
}

/** The bomblet: drawn like the shell, mid-arc in the `air` layer, tumbling. */
export const projectileThumperBomblet = defineSprite({
  id: 'projectile.thumper_bomblet',
  size: { w: 4, h: 4 },
  anchor: { x: 2, y: 2 },
  palette: 'everglow',
  outline: 'auto',
  frames: { spin_0: bomblet(0), spin_1: bomblet(1) },
  anims: { spin: { frames: ['spin_0', 'spin_1'], fps: 12 } },
});
