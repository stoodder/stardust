// Chonk (`chonk`): a big, slow, contented Skitterkin with thick back scutes (light armor). The
// scutes carry the Armored tell's steel highlight (art-direction §8 Trait tells).
import { defineSprite } from '../defineSprite.ts';
import { at, plot } from '../helpers.ts';
import { EYE, finish, skitterBody } from './skitter.ts';

const W = 24;
const H = 19;

function chonk(facing: 'se' | 'ne', step: 0 | 1): string[] {
  const sink = step === 1 ? 1 : 0; // a heavy squash on the planted step
  const cx = 11.5;
  const cy = 9.5 + sink * 0.5;
  const rx = 10.5 + sink * 0.5;
  const ry = 7.5 - sink * 0.5;
  const g = skitterBody({ w: W, h: H, cx, cy, rx, ry, facing, belly: 0.55 });
  // Scutes: overlapping plates across the upper back, a dark seam under each steel-lit edge.
  const top = Math.ceil(cy - ry);
  for (let y = top + 1; y < cy + (facing === 'ne' ? 2 : -1); y++) {
    for (let x = 0; x < W; x++) {
      const ch = at(g, x, y);
      if (ch === '.' || ch === '7' || ch === '8' || ch === '9') continue;
      const dx = (x + 0.5 - cx) / rx;
      if (Math.abs(dx) > 0.85) continue;
      const r = (y - top + Math.round(dx * dx * 3)) % 4;
      if (r === 3) plot(g, x, y, '1');
      else if (r === 0) plot(g, x, y, dx < 0.2 ? 'S' : 'T');
    }
  }
  const legs =
    step === 0
      ? ['.11..11....11..11.', '.00..00....00..00.']
      : ['11...11...11...11.', '00...00...00...00.'];
  if (facing === 'se') {
    return finish(g, [
      [2, H - 2, legs],
      [9, 0 + sink, ['.dc.', 'cdcb']],
      [14, 8 + sink, EYE],
      [18, 8 + sink, EYE],
      [16, 11 + sink, ['kk']],
    ]);
  }
  return finish(g, [
    [2, H - 2, legs],
    [9, 0 + sink, ['.dc.', 'cdcb']],
    [6, 5 + sink, ['+...+', '..*..']],
  ]);
}

export const enemyChonk = defineSprite({
  id: 'enemy.chonk',
  size: { w: W, h: H },
  anchor: { x: 12, y: 18 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { S: 'steel.4', T: 'steel.3' },
  frames: {
    walk_se_0: chonk('se', 0),
    walk_se_1: chonk('se', 1),
    walk_ne_0: chonk('ne', 0),
    walk_ne_1: chonk('ne', 1),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 6 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 6 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
