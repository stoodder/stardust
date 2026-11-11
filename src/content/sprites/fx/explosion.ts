// The explosive burst (art-direction §7): Thumper shells, the Orbital Strike, and Act I's death pop.
// Four frames at 12 fps (render/vfx/fxTiming.ts BURST_MS): a big white star of a flash, a fireball
// flinging debris, a ring of fire around rising puffs, then the puffs drifting apart with dying embers. The smoke
// is solid puffs (a `3` rim, a `4` core), never a 1 px checker, so it never reads as a
// transparency grid at 1× (review R14). The
// first frame is the biggest and brightest, so the hit lands on the frame it happens (D024's punch).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, hash01, plot, rows, type CharGrid } from '../helpers.ts';

const S = 19;
const C = S / 2;

/** A spike of flash from the center out to `len`, white-hot near the core. */
function spike(g: CharGrid, dx: number, dy: number, len: number): void {
  for (let k = 3; k <= len; k++) {
    const x = Math.round(C - 0.5 + dx * k);
    const y = Math.round(C - 0.5 + dy * k);
    plot(g, x, y, k <= len - 3 ? 'w' : k <= len - 1 ? 'e' : 'd');
  }
}

/**
 * A puff of smoke: a solid disc, a `3` rim round a `4` core. Solid, never a 1 px checker, which
 * reads as a transparency grid at 1× (review R14); the view fades the puffs by alpha instead.
 */
export function puff(g: CharGrid, cx: number, cy: number, r: number): void {
  // A little cloud: a round crown over two lobes, lit from the upper left.
  const lobes = [
    [cx, cy - r * 0.25, r],
    [cx - r * 0.75, cy + r * 0.3, r * 0.7],
    [cx + r * 0.75, cy + r * 0.3, r * 0.7],
  ] as const;
  for (const [lx, ly, lr] of lobes) disc(g, lx, ly, lr, () => '3');
  disc(g, cx - r * 0.3, cy - r * 0.45, r * 0.5, () => '4');
}

/** Burst frame `k` of 4: flash, fireball, ring, smoke. */
function burst(k: number): string[] {
  const g = grid(S, S);
  if (k === 0) {
    disc(g, C, C, 5.2, (d) => (d < 2.6 ? 'w' : d < 4 ? 'e' : 'd'));
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      spike(g, dx, dy, 9);
    }
    for (const [dx, dy] of [
      [0.72, 0.72],
      [-0.72, 0.72],
      [0.72, -0.72],
      [-0.72, -0.72],
    ] as const) {
      spike(g, dx, dy, 7);
    }
  } else if (k === 1) {
    disc(g, C, C, 7.6, (d, x, y) =>
      d < 2.5 ? 'w' : d < 4.6 ? 'e' : d < 6.2 ? 'd' : hash01(x, y, 1) < 0.35 ? 'c' : 'd',
    );
    // Debris flung clear of the fireball.
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const d = Math.hypot(x + 0.5 - C, y + 0.5 - C);
        if (d > 8.2 && d <= 9.5 && hash01(x, y, 4) < 0.12)
          plot(g, x, y, hash01(x, y, 5) < 0.5 ? 'd' : '1');
      }
    }
  } else if (k === 2) {
    // A ring of fire round a clearing, three small solid puffs of smoke rising inside it.
    disc(g, C, C, 8.8, (d, x, y) => {
      if (d < 6.2) return '.';
      return hash01(x, y, 3) < 0.45 ? 'd' : d < 7.6 ? 'e' : '4';
    });
    for (const [px, py, r] of [
      [7, 8, 1.6],
      [11.5, 7.5, 1.4],
      [9.5, 11.5, 1.3],
    ] as const) {
      puff(g, px, py, r);
    }
  } else {
    // Smoke: small solid puffs drifting apart (the view fades them out), a few dying embers.
    const puffs = [
      [5, 6, 1.8],
      [13, 5, 2],
      [12, 13, 1.6],
      [5.5, 13.5, 1.4],
      [9.5, 9.5, 1.1],
    ] as const;
    for (const [px, py, r] of puffs) puff(g, px, py, r);
    plot(g, 9, 3, 'd');
    plot(g, 16, 10, 'c');
    plot(g, 2, 10, 'd');
  }
  return rows(g);
}

/** The explosive burst (Thumper shells, Orbital Strike, the death pop). Plays once. */
export const fxExplosion = defineSprite({
  id: 'fx.explosion',
  size: { w: S, h: S },
  // The anchor sits below the center as before (FxView lifts it 4 px onto the ground point).
  anchor: { x: 9, y: 13 },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['a4', 'hi'], radius: 2 },
  frames: { f0: burst(0), f1: burst(1), f2: burst(2), f3: burst(3) },
  anims: { burst: { frames: ['f0', 'f1', 'f2', 'f3'], fps: 12, loop: false } },
});
