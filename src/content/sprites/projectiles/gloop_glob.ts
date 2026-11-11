// The Gloop Spitter's spit (design/towers.md § 7; T705, kept by T740b): a
// wobbling glob of acid in the Skitterkin accent greens (never the Hollow's acid hue), with a
// white core like every projectile (art-direction §7), lobbed like the Thumper's shell. Two
// frames: round, then squashed mid-wobble.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows } from '../helpers.ts';

function glob(squash: 0 | 1): string[] {
  const g = grid(6, 6);
  const body: readonly (readonly [number, number])[] =
    squash === 0
      ? [
          [2, 0],
          [3, 0],
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
          [0, 2],
          [1, 2],
          [2, 2],
          [3, 2],
          [4, 2],
          [5, 2],
          [0, 3],
          [1, 3],
          [2, 3],
          [3, 3],
          [4, 3],
          [5, 3],
          [1, 4],
          [2, 4],
          [3, 4],
          [4, 4],
          [2, 5],
          [3, 5],
        ]
      : [
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
          [0, 2],
          [1, 2],
          [2, 2],
          [3, 2],
          [4, 2],
          [5, 2],
          [0, 3],
          [1, 3],
          [2, 3],
          [3, 3],
          [4, 3],
          [5, 3],
          [0, 4],
          [1, 4],
          [2, 4],
          [3, 4],
          [4, 4],
          [5, 4],
          [2, 5],
          [3, 5],
        ];
  for (const [x, y] of body) plot(g, x, y, y >= 4 ? 'c' : 'd');
  for (const [x, y] of body) if (y <= 2 && (x === 3 || x === 4)) plot(g, x, y, 'e');
  plot(g, 2, 2, 'w');
  return rows(g);
}

/** The glob: drawn mid-arc in the `air` layer, wobbling. */
export const projectileGloopGlob = defineSprite({
  id: 'projectile.gloop_glob',
  size: { w: 6, h: 6 },
  anchor: { x: 3, y: 3 },
  palette: 'skitterkin',
  outline: 'auto',
  frames: { spin_0: glob(0), spin_1: glob(1) },
  anims: { spin: { frames: ['spin_0', 'spin_1'], fps: 8 } },
});
