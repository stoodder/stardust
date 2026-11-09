// Zoomer (`zoomer`): a lean, low Skitterkin built for speed, tuft swept back, leaning into the run.
import { defineSprite } from '../defineSprite.ts';
import { EYE, finish, skitterBody } from './skitter.ts';

const W = 17;
const H = 10;

function zoomer(facing: 'se' | 'ne', step: 0 | 1 | 2): string[] {
  const bob = step === 1 ? 1 : 0;
  const g = skitterBody({ w: W, h: H, cx: 9, cy: 5 - bob, rx: 7, ry: 3.6, facing, belly: 0.2 });
  // prettier-ignore
  const legs = [
    ['.1..1...1..1.', '0...0..0..0..'],
    ['..1..1.1..1..', '.0...00..0...'],
    ['.1...1..1..1.', '..0..0...0..0'],
  ][step] ?? [];
  // The tuft streams back (left), like it can't keep up.
  const tuft = ['cdd...', '.bccd.', '..bb..'];
  if (facing === 'se') {
    return finish(g, [
      [3, H - 2, legs],
      [1, 0 - bob, tuft],
      [11, 3 - bob, EYE],
      [14, 3 - bob, EYE],
      [13, 6 - bob, ['k']],
      [4, 3 - bob, ['+.+']],
    ]);
  }
  return finish(g, [
    [3, H - 2, legs],
    [1, 0 - bob, tuft],
    [6, 2 - bob, ['+.+.+', '.*.*.']],
  ]);
}

export const enemyZoomer = defineSprite({
  id: 'enemy.zoomer',
  size: { w: W, h: H },
  anchor: { x: 9, y: 9 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    walk_se_0: zoomer('se', 0),
    walk_se_1: zoomer('se', 1),
    walk_se_2: zoomer('se', 2),
    walk_ne_0: zoomer('ne', 0),
    walk_ne_1: zoomer('ne', 1),
    walk_ne_2: zoomer('ne', 2),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2'], fps: 10 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2'], fps: 10 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
