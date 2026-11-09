// Nibbler (`nibbler`): the basic Skitterkin. Small, round, all eyes and tuft, with a bounce.
import { defineSprite } from '../defineSprite.ts';
import { DEATH_ANIM, deathFrames } from './death.ts';
import { BIG_EYE, finish, skitterBody } from './skitter.ts';

const W = 14;
const H = 12;

function nibbler(facing: 'se' | 'ne', step: 0 | 1): string[] {
  const up = step === 1 ? 1 : 0; // the bounce: stretched and 1 px up on the passing step
  const g = skitterBody({
    w: W,
    h: H,
    cx: 7,
    cy: 6.5 - up,
    rx: step === 1 ? 5.4 : 6,
    ry: step === 1 ? 4.9 : 4.4,
    facing,
    belly: 0.4,
  });
  const legs = step === 0 ? ['.1.1...1.1.', '.0.0...0.0.'] : ['.1..1.1..1.', '0...0.0...0'];
  const tuft = ['.dc.', 'cdcb', '.bb.'];
  if (facing === 'se') {
    return finish(g, [
      [1, H - 2, legs],
      [5, 0 - up, tuft],
      [7, 4 - up, BIG_EYE],
      [10, 4 - up, BIG_EYE],
      [9, 7 - up, ['k']],
      [3, 4 - up, ['+', '.', '.']],
      [2, 6 - up, ['+']],
    ]);
  }
  return finish(g, [
    [1, H - 2, legs],
    [5, 0 - up, tuft],
    // The shimmer along the back, brighter seen from behind.
    [4, 4 - up, ['+.+', '.*.', '+.+']],
    [9, 5 - up, ['+', '*']],
  ]);
}

export const enemyNibbler = defineSprite({
  id: 'enemy.nibbler',
  size: { w: W, h: H },
  anchor: { x: 7, y: 11 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    walk_se_0: nibbler('se', 0),
    walk_se_1: nibbler('se', 1),
    walk_ne_0: nibbler('ne', 0),
    walk_ne_1: nibbler('ne', 1),
    ...deathFrames(nibbler('se', 0), { x: 7, y: 11 }),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
    death: DEATH_ANIM,
  },
});
