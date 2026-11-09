// The Brood Hauler's young (design/enemies.md § Brood Hauler): the tiny shapes that scurry back
// the way they came when a Hauler's sack bursts. Render-only (the sim decides what spawns): non-
// hostile, untargetable, no leak. Teacup-sized, one huge eye, the faint pink-gold shimmer frost
// of the very young on the back, legs a blur.
import { defineSprite } from '../defineSprite.ts';
import { finish, skitterBody } from './skitter.ts';

const W = 9;
const H = 7;

function young(facing: 'se' | 'ne', step: 0 | 1): string[] {
  const up = step === 1 ? 1 : 0; // a scurry: hop, land, hop
  const g = skitterBody({
    w: W,
    h: H,
    cx: 4.5,
    cy: 3.5 - up * 0.5,
    rx: 4,
    ry: 2.8,
    facing,
    belly: 0.3,
  });
  const legs = step === 0 ? ['1.1..1.1'] : ['.1.11.1.'];
  if (facing === 'se') {
    return finish(g, [
      [0, H - 1, legs],
      [5, 2 - up, ['wk', 'kk']],
      [2, 1 - up, ['P', '+']],
    ]);
  }
  return finish(g, [
    [0, H - 1, legs],
    [2, 1 - up, ['P*P', '.+.']],
  ]);
}

export const enemyHaulerYoung = defineSprite({
  id: 'enemy.hauler_young',
  size: { w: W, h: H },
  anchor: { x: 4, y: 7 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { P: 'pink.3' },
  frames: {
    walk_se_0: young('se', 0),
    walk_se_1: young('se', 1),
    walk_ne_0: young('ne', 0),
    walk_ne_1: young('ne', 1),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 12 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 12 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
