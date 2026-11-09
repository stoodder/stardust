// The confetti cannon (A1M5 party dressing, act1.md § A1M5): a stubby white Everglow mortar with a
// pink party band, aimed at the sky on a steel tripod. `idle` stands ready; `fire_0`–`fire_2`
// (anim `fire`, once) kick it back with a white puff and throw a fountain of confetti in every
// party colour (fired on a script cue: props on cues, T312b).
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, line, plot, rows, stamp } from '../helpers.ts';

const W = 22;
const H = 32;
const AX = 10;
const AY = 29;
const CONFETTI = ['P', 'G', 'B', '7', 'c', 'w'] as const;

function cannon(shot: -1 | 0 | 1 | 2): string[] {
  const g = grid(W, H);
  const kick = shot === 0 ? 1 : 0; // recoil: the barrel dips a pixel as it fires
  // The tripod and its shadow.
  for (let x = AX - 5; x <= AX + 5; x++) plot(g, x, AY + 1, '_');
  line(g, AX, AY - 6, AX - 4, AY, '1');
  line(g, AX, AY - 6, AX + 4, AY, '0');
  line(g, AX, AY - 6, AX + 1, AY + 1, '1');
  // The barrel, tilted up and to the right: lit left, shaded right, the pink band, an ink muzzle.
  for (let i = 0; i < 10; i++) {
    const cx = AX - 1 + i * 0.5;
    const cy = AY - 6 - i + kick;
    for (let d = -2; d <= 2; d++) {
      const x = Math.round(cx + d);
      const y = Math.round(cy + d * 0.5);
      let ch = d < 0 ? '4' : d === 0 ? '3' : '2';
      if (d === -2) ch = 'w';
      if (i === 5 || i === 6) ch = d < 1 ? 'P' : 'Q';
      plot(g, x, y, ch);
    }
  }
  stamp(g, AX + 2, AY - 17 + kick, ['.kk.', 'kkkk', '.kk.']);
  if (shot < 0) return rows(g);
  // The shot: a white puff at the muzzle, then confetti flung up and drifting out.
  const mx = AX + 4;
  const my = AY - 18;
  if (shot === 0) stamp(g, mx - 2, my - 3, ['.ww.', 'wwww', '.ww.']);
  const n = shot === 0 ? 8 : 16;
  for (let i = 0; i < n; i++) {
    const spread = (hash01(i, 1, 5) - 0.5) * (4 + shot * 6);
    const rise = 2 + hash01(i, 2, 5) * (4 + shot * 5) - (shot === 2 ? hash01(i, 4, 5) * 4 : 0);
    const x = Math.round(mx + spread);
    const y = Math.round(my - rise);
    if (y < 0 || y >= H) continue;
    plot(g, x, y, CONFETTI[i % CONFETTI.length] ?? 'w');
  }
  return rows(g);
}

export const propConfettiCannon = defineSprite({
  id: 'prop.confetti_cannon',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  legend: { P: 'pink.3', Q: 'pink.2', G: 'gold.4', B: 'blue.4' },
  frames: { idle: cannon(-1), fire_0: cannon(0), fire_1: cannon(1), fire_2: cannon(2) },
  anims: { fire: { frames: ['fire_0', 'fire_1', 'fire_2', 'idle'], fps: 8, loop: false } },
});
