// Zibzab's shell-shop (A1M3 decor from W6, act1.md § A1M3; characters.md § Zibzab): "Zibzab's
// Genuine Pre-Owned Defensive Solutions", a great Vrell brass shell he drags from place to place,
// patched with patina plates, on skid runners. Its mouth opens toward the road under a striped
// awning: a plank counter with a very good gun on a hook and price tags on everything (Vrell
// state the price first), a lantern at the awning's corner, and the motto scrawled in white
// across the shell ("No refunds, no regrets!"; small print at 1×). Vrell scrap palette.
// Frames `v0`/`v1`: the lantern flickers and the price sign swings (anim `idle`). It arrives on a
// script cue (props on cues: T312b) and stays as dressing.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, hash01, line, plot, rows, stamp } from '../helpers.ts';

const W = 36;
const H = 32;
const AX = 18;
const AY = 28;

function shop(frame: 0 | 1): string[] {
  const g = grid(W, H);
  // Its shadow, and the skid runners it's dragged on.
  for (let x = 4; x < 33; x++) {
    plot(g, x, AY + 1, '_');
    if (x > 6 && x < 30) plot(g, x, AY + 2, '_');
  }
  line(g, 6, AY, 30, AY, '0');
  line(g, 5, AY - 1, 5, AY - 1, '0');
  // The shell: a brass dome lit from the upper left, a spiral groove, patina patches.
  const cx = 16;
  const cy = 15;
  disc(g, cx, cy, 13, (d, x, y) => {
    const dx = (x + 0.5 - cx) / 13;
    const dy = (y + 0.5 - cy) / 13;
    const lit = -0.6 * dx - 0.8 * dy;
    const spiral = Math.abs(((Math.atan2(dy, dx) / (2 * Math.PI) + d / 5.5) % 1) - 0.5) < 0.05;
    if (spiral && d > 2) return '1';
    if (hash01(Math.floor(x / 4), Math.floor(y / 3), 7) < 0.18 && d < 11.5) {
      return lit > 0 ? 'c' : 'b'; // a patina patch
    }
    if (d > 12) return lit > 0.3 ? '2' : '0';
    return lit > 0.45 ? '4' : lit > 0 ? '3' : lit > -0.45 ? '2' : '1';
  });
  // The motto, scrawled in white small print along the shell.
  for (const [x, y, n] of [
    [7, 9, 5],
    [6, 11, 7],
  ] as const) {
    for (let i = 0; i < n; i++) if ((i + y) % 3 !== 0) plot(g, x + i, y, 'w');
  }
  // The mouth, toward the road (front right): dark inside, a plank counter across it.
  disc(g, 23, 21, 6.5, (d) => (d > 5.8 ? '1' : 'k'));
  for (let x = 17; x <= 30; x++) {
    plot(g, x, 23, '3');
    plot(g, x, 24, '1');
  }
  // On the counter: the very good gun (steel, on a hook) and price tags.
  stamp(g, 20, 18, ['.S...', 'SSSSS', '.T.TS', '.T...']);
  line(g, 22, 15, 22, 17, '2');
  stamp(g, 26, 21, ['ww', 'wk']);
  stamp(g, 18, 21, ['w', 'k']);
  // The striped awning over the mouth, and its lantern at the corner.
  for (let x = 17; x <= 32; x++) {
    const y = 13 + Math.floor((x - 17) / 4);
    plot(g, x, y, Math.floor(x / 2) % 2 === 0 ? 'O' : 'W');
    plot(g, x, y + 1, Math.floor(x / 2) % 2 === 0 ? 'P' : 'W');
  }
  line(g, 32, 17, 32, 18, '1');
  stamp(g, 31, 19, frame === 0 ? ['1+1', '.+.'] : ['1*1', '.*.']);
  // The price sign on a post by the counter, swinging.
  line(g, 33, 20, 33, AY - 1, '1');
  stamp(g, frame === 0 ? 30 : 31, 20, ['wwww', 'wkkw', 'wwww'].slice(0, 3));
  return rows(g);
}

export const propZibzabShop = defineSprite({
  id: 'prop.zibzab_shop',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'vrell',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { S: 'steel.3', T: 'steel.1', O: 'orange.3', P: 'orange.2', W: 'white.0' },
  frames: { v0: shop(0), v1: shop(1) },
  anims: { idle: { frames: ['v0', 'v1'], fps: 2 } },
});
