import { defineSprite } from '../defineSprite.ts';
import { disc, grid, hash01, rows } from '../helpers.ts';

/** Burst frame `k` of 4: white flash, fireball, ring, smoke. */
function burst(k: number): string[] {
  const g = grid(15, 15);
  const c = 7.5;
  if (k === 0) {
    disc(g, c, c, 4, (d) => (d < 2 ? 'w' : d < 3 ? 'e' : 'd'));
  } else if (k === 1) {
    disc(g, c, c, 6.5, (d, x, y) =>
      d < 2.5 ? 'w' : d < 4.5 ? 'e' : hash01(x, y, 1) < 0.3 ? 'c' : 'd',
    );
  } else if (k === 2) {
    disc(g, c, c, 7.2, (d, x, y) => {
      if (d < 5) return (x + y) % 2 === 0 && hash01(x, y, 2) < 0.6 ? '4' : '.';
      return hash01(x, y, 3) < 0.45 ? 'd' : '4';
    });
  } else {
    // Smoke: a few light puffs, dithered so they read as thinning, not solid.
    const puffs = [
      [4, 5, 2.2],
      [10, 4, 2.5],
      [9, 10, 2],
      [4, 11, 1.6],
    ] as const;
    for (const [px, py, r] of puffs) {
      disc(g, px, py, r, (d, x, y) => (d < 1.2 ? '4' : (x + y) % 2 === 0 ? '3' : '.'));
    }
  }
  return rows(g);
}

/** The explosive burst (Thumper shells, Orbital Strike). Plays once. */
export const fxExplosion = defineSprite({
  id: 'fx.explosion',
  size: { w: 15, h: 15 },
  anchor: { x: 7, y: 11 },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['a4', 'hi'], radius: 2 },
  frames: { f0: burst(0), f1: burst(1), f2: burst(2), f3: burst(3) },
  anims: { burst: { frames: ['f0', 'f1', 'f2', 'f3'], fps: 12, loop: false } },
});
