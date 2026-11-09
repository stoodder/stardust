// Digger (`digger`, design/enemies.md § 5.1): a long, low, mole-ish Skitterkin that digs in every
// few seconds. It leads with a steel scoop plate on its snout and wears a second plate over its
// shoulders (its armor 1: the `armored` tell's steel), scrabbles on big pale claws, and carries a
// crust of dirt on its back. Low and long where a Nibbler is round and tall.
//
// The `burrower` tell (art-direction §8): `dig_<facing>` is the 0.8 s dig-in, nose down and rump
// up, claws flinging a fan of dirt clods up behind it in two alternating patterns. Underground it
// has no sprite (render draws the ripple trail), so there is no mound frame.
import { defineSprite } from '../defineSprite.ts';
import { at, plot, stamp, type CharGrid } from '../helpers.ts';
import { finish, skitterBody } from './skitter.ts';

const W = 22;
const H = 15;
const CX = 11;

/** Dirt clods flung up behind the body (the left, rear side), two alternating patterns. */
// prettier-ignore
const SPRAY = [
  ['..N....', 'O...O..', '...N...', '.O...O.', 'N..O...', '...O.N.'],
  ['O...O..', '..N....', 'O...O..', '..N..O.', '.O.....', 'N...O..'],
] as const;

/** Paints the steel plates over the body's existing pixels: snout scoop and shoulder plate. */
function plates(g: CharGrid, facing: 'se' | 'ne', cy: number): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = at(g, x, y);
      if (ch === '.' || '789'.includes(ch)) continue;
      const dx = x + 0.5 - CX;
      const dy = y + 0.5 - cy;
      // The shoulder plate: a band across the upper back.
      if (dy < -1.5 && Math.abs(dx - 1) < 4) plot(g, x, y, dy < -2.5 ? 'S' : 'T');
      else if (dy >= -1.5 && dy < -0.5 && Math.abs(dx - 1) < 4) plot(g, x, y, '3');
      // The snout scoop at the front (facing SE: the right end).
      if (facing === 'se' && dx > 4.5 && dy > -2.5 && dy < 1.5) plot(g, x, y, dy < 0.5 ? 'S' : 'T');
    }
  }
}

function digger(facing: 'se' | 'ne', step: 0 | 1, dig: boolean): string[] {
  const cy = dig ? 10 : 9.5 - (step === 1 ? 0.5 : 0);
  const g = skitterBody({
    w: W,
    h: H,
    cx: CX,
    cy,
    rx: dig ? 7.5 : 8,
    ry: dig ? 3.6 : 4,
    facing,
    belly: 0.3,
  });
  plates(g, facing, cy);
  // The crust of dirt on its rump.
  stamp(g, 4, Math.round(cy) - 3, ['.NO', 'ONN']);
  const top = Math.round(cy);
  if (dig) {
    // Nose down into the ground, claws scrabbling forward, dirt flying back.
    const claws =
      step === 0 ? ['S.S.....S.S.S', 'S.S.....S.S.S'] : ['.S.S...S.S.S.', '.S.S...S.S.S.'];
    stamp(g, 4, H - 2, claws);
    stamp(g, 0, 0, SPRAY[step]);
    if (facing === 'se') {
      plot(g, 15, top - 1, 'k');
      plot(g, 16, top - 1, 'k');
    }
    return finish(g, []);
  }
  const legs =
    step === 0 ? ['.1.1.....1.1..', '.0.0.....S.S..'] : ['1.1.....1.1...', '0.0.....S.S...'];
  if (facing === 'se') {
    return finish(g, [
      [4, H - 2, legs],
      // Big pale digging claws out front, and small eyes squinting over the scoop.
      [16, H - 3, ['S.S', 'T.T']],
      [14, top - 3, ['wk', 'kk']],
      [12, top + 1, ['+']],
    ]);
  }
  return finish(g, [
    [4, H - 2, legs],
    [5, top + 1, ['+.+']],
  ]);
}

export const enemyDigger = defineSprite({
  id: 'enemy.digger',
  size: { w: W, h: H },
  anchor: { x: CX, y: H - 1 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  // Steel plates (the armored tell) and dirt (grime: the burrower tell's color).
  legend: { S: 'steel.4', T: 'steel.3', M: 'grime.2', N: 'grime.3', O: 'grime.4' },
  frames: {
    walk_se_0: digger('se', 0, false),
    walk_se_1: digger('se', 1, false),
    walk_ne_0: digger('ne', 0, false),
    walk_ne_1: digger('ne', 1, false),
    dig_se_0: digger('se', 0, true),
    dig_se_1: digger('se', 1, true),
    dig_ne_0: digger('ne', 0, true),
    dig_ne_1: digger('ne', 1, true),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
    // The 0.8 s dig-in tell: the spray alternates at 10 fps, so it reads at 2× too.
    dig_se: { frames: ['dig_se_0', 'dig_se_1'], fps: 10 },
    dig_sw: { mirrorOf: 'dig_se' },
    dig_ne: { frames: ['dig_ne_0', 'dig_ne_1'], fps: 10 },
    dig_nw: { mirrorOf: 'dig_ne' },
  },
});
