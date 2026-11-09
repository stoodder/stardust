// Zoomer (`zoomer`): a lean, low Skitterkin built for speed, tuft swept back, leaning into the run.
// Its body runs hotter than a Nibbler's (toward `orange.3`) and it trails `orange.4` speed lines,
// the body cue of the `fast` tell (art-direction §8).
import { defineSprite } from '../defineSprite.ts';
import { DEATH_ANIM, deathFrames } from './death.ts';
import { fromRows, recolor, rows } from '../helpers.ts';
import { EYE, finish, skitterBody } from './skitter.ts';

const W = 20;
const H = 10;
/** The body sits 3 px right of the canvas edge, leaving room for the speed lines behind it. */
const OX = 3;

/** Speed lines trailing the body, alternating between two patterns as it runs. */
// prettier-ignore
const SPEED_LINES = [
  ['PP.P', '....', '.PPP', '....', 'PP..'],
  ['.PP.', '....', 'PP.P', '....', '.PPP'],
] as const;

/** Body ramp steps shifted toward orange: `2` → orange.2, `3` → orange.3, `4` → orange.4. */
const HOT = { '2': 'Q', '3': 'O', '4': 'P' } as const;

function zoomer(facing: 'se' | 'ne', step: 0 | 1 | 2): string[] {
  const bob = step === 1 ? 1 : 0;
  const body = skitterBody({
    w: W,
    h: H,
    cx: 9 + OX,
    cy: 5 - bob,
    rx: 7,
    ry: 3.6,
    facing,
    belly: 0.2,
  });
  const g = fromRows(recolor(rows(body), HOT));
  // prettier-ignore
  const legs = [
    ['.1..1...1..1.', '0...0..0..0..'],
    ['..1..1.1..1..', '.0...00..0...'],
    ['.1...1..1..1.', '..0..0...0..0'],
  ][step] ?? [];
  // The tuft streams back (left), like it can't keep up.
  const tuft = ['cdd...', '.bccd.', '..bb..'];
  const lines: readonly string[] = SPEED_LINES[step % 2] ?? [];
  if (facing === 'se') {
    return finish(g, [
      [0, 3 - bob, lines],
      [3 + OX, H - 2, legs],
      [1 + OX, 0 - bob, tuft],
      [11 + OX, 3 - bob, EYE],
      [14 + OX, 3 - bob, EYE],
      [13 + OX, 6 - bob, ['k']],
      [4 + OX, 3 - bob, ['+.+']],
    ]);
  }
  return finish(g, [
    [0, 4 - bob, lines],
    [3 + OX, H - 2, legs],
    [1 + OX, 0 - bob, tuft],
    [6 + OX, 2 - bob, ['+.+.+', '.*.*.']],
  ]);
}

export const enemyZoomer = defineSprite({
  id: 'enemy.zoomer',
  size: { w: W, h: H },
  anchor: { x: 9 + OX, y: 9 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { O: 'orange.3', P: 'orange.4', Q: 'orange.2' },
  frames: {
    walk_se_0: zoomer('se', 0),
    walk_se_1: zoomer('se', 1),
    walk_se_2: zoomer('se', 2),
    walk_ne_0: zoomer('ne', 0),
    walk_ne_1: zoomer('ne', 1),
    walk_ne_2: zoomer('ne', 2),
    ...deathFrames(zoomer('se', 0), { x: 9 + OX, y: 9 }),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2'], fps: 10 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2'], fps: 10 },
    walk_nw: { mirrorOf: 'walk_ne' },
    death: DEATH_ANIM,
  },
});
