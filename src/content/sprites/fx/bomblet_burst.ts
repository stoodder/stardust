// A bomblet's pop (Cluster Thumper, design/towers.md § 7): a small burst, sized to the bomblet's
// 0.6-tile splash, so four of them around a shell's big `fx.explosion` read as a cluster. Three
// frames at 12 fps: flash, fireball, a ring round a puff of smoke. Anchored like `fx.explosion` (below its center).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, hash01, plot, rows } from '../helpers.ts';
import { puff } from './explosion.ts';

const S = 11;
const C = S / 2;

function pop(k: number): string[] {
  const g = grid(S, S);
  if (k === 0) {
    disc(g, C, C, 2.8, (d) => (d < 1.4 ? 'w' : 'e'));
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      plot(g, Math.round(C - 0.5 + dx * 4), Math.round(C - 0.5 + dy * 4), 'd');
      plot(g, Math.round(C - 0.5 + dx * 3), Math.round(C - 0.5 + dy * 3), 'e');
    }
  } else if (k === 1) {
    disc(g, C, C, 4.4, (d, x, y) =>
      d < 1.6 ? 'w' : d < 2.8 ? 'e' : hash01(x, y, 6) < 0.3 ? 'c' : 'd',
    );
  } else {
    // The ring, and one small solid puff of smoke in it (no 1 px checker; review R14).
    disc(g, C, C, 5, (d, x, y) => {
      if (d < 3.4) return '.';
      return hash01(x, y, 8) < 0.5 ? 'd' : '4';
    });
    puff(g, C, C + 0.3, 1.3);
  }
  return rows(g);
}

export const fxBombletBurst = defineSprite({
  id: 'fx.bomblet_burst',
  size: { w: S, h: S },
  anchor: { x: 5, y: 9 },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['a4', 'hi'], radius: 1 },
  frames: { f0: pop(0), f1: pop(1), f2: pop(2) },
  anims: { burst: { frames: ['f0', 'f1', 'f2'], fps: 12, loop: false } },
});
