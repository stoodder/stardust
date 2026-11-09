// The youngling (`enemy.youngling`, design/enemies.md § 5.1 youngling modifier; art-direction §6):
// the small sprite variant drawn for a unit whose wave group carries the `youngling` tag (the
// Quiet Wave's little ones behind Old Thrum) and for the Peeker. A smaller Nibbler: rounder, with
// eyes too big for it, a single sprout of a tuft, and the faint pink-gold shimmer frost of the very
// young on its back. It toddles: a hop, a wobble, a hop.
import { defineSprite } from '../defineSprite.ts';
import { finish, skitterBody } from './skitter.ts';

const W = 11;
const H = 10;

/** One youngling frame (the Peeker reuses the front view, props/peeker.ts). */
export function youngling(facing: 'se' | 'ne', step: 0 | 1): string[] {
  const up = step === 1 ? 1 : 0;
  const g = skitterBody({
    w: W,
    h: H,
    cx: 5.5,
    cy: 5 - up * 0.5,
    rx: step === 1 ? 4.2 : 4.6,
    ry: step === 1 ? 3.9 : 3.5,
    facing,
    belly: 0.35,
  });
  const legs = step === 0 ? ['.1.1.1.1.', '.0.0.0.0.'] : ['..1...1..', '.0.0.0.0.'];
  if (facing === 'se') {
    return finish(g, [
      [1, H - 2, legs],
      // One sprout of a tuft.
      [4, 0 - up, ['.c', 'b.']],
      [5, 3 - up, ['wk', 'kk', 'kk']],
      [8, 3 - up, ['wk', 'kk', 'kk']],
      [2, 3 - up, ['P', '+']],
    ]);
  }
  return finish(g, [
    [1, H - 2, legs],
    [4, 0 - up, ['.c', 'b.']],
    [3, 3 - up, ['P*P', '.+.']],
  ]);
}

export const enemyYoungling = defineSprite({
  id: 'enemy.youngling',
  size: { w: W, h: H },
  anchor: { x: 5, y: H - 1 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { P: 'pink.3' },
  frames: {
    walk_se_0: youngling('se', 0),
    walk_se_1: youngling('se', 1),
    walk_ne_0: youngling('ne', 0),
    walk_ne_1: youngling('ne', 1),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
