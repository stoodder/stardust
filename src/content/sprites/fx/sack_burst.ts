// A Brood Hauler's sack bursting when it dies (design/enemies.md § Brood Hauler): the bag swells
// and splits, burlap shreds fly, and a puff of glitter (gold and pink) drifts down. Act I slapstick,
// so it pops rather than mourns; the young that scurry out are `enemy.hauler_young`. Plays once,
// drawn at the Hauler's ground point. From Act II the sack is untied with its young showing
// (art-direction §6, D119), so `burst_young` opens on that sack straining (`young_0`: three young
// big-eyed in its mouth) before the same pop; render plays it for a fleeing Hauler.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, hash01, plot, rows, type CharGrid } from '../helpers.ts';
import { sack, SACK_LEGEND, youngHeads } from '../enemies/sack.ts';

const W = 25;
const H = 22;
/** Where the sack rode: the burst's center, above the ground point. */
const CX = 12.5;
const CY = 9;

/** `n` glitter flecks scattered in a ring between radii r0 and r1, seeded by frame. */
function glitter(g: CharGrid, n: number, r0: number, r1: number, seed: number, drop: number): void {
  for (let i = 0; i < n; i++) {
    const a = hash01(i, 1, seed) * Math.PI * 2;
    const r = r0 + hash01(i, 2, seed) * (r1 - r0);
    const x = Math.round(CX + Math.cos(a) * r);
    const y = Math.round(CY + Math.sin(a) * r * 0.75 + drop);
    const pick = hash01(i, 3, seed);
    plot(g, x, y, pick < 0.35 ? '*' : pick < 0.6 ? '+' : pick < 0.85 ? 'P' : 'w');
  }
}

/** Torn burlap shreds flung out at radius r (2 px rags, lit edge up). */
function shreds(g: CharGrid, r: number, drop: number): void {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const x = Math.round(CX + Math.cos(a) * r);
    const y = Math.round(CY + Math.sin(a) * r * 0.7 + drop);
    plot(g, x, y, 'G');
    plot(g, x + 1, y, i % 2 === 0 ? 'H' : 'J');
    if (i % 3 === 0) plot(g, x, y + 1, 'J');
  }
}

function burst(k: number, young = false): string[] {
  const g = grid(W, H);
  if (k === 0 && young) {
    // Act II: the untied sack swells with its young crowding the mouth, a white split down it.
    const bag = { cx: CX, cy: CY + 2, rx: 7, ry: 6, twinkle: 0, young: 'se' } as const;
    sack(g, bag);
    youngHeads(g, bag, 0, 0);
    for (let y = 9; y <= 13; y++) plot(g, Math.round(CX - 0.5 + (y % 2)), y, 'w');
    glitter(g, 4, 7, 9, 1, 0);
  } else if (k === 0) {
    // Swelling: the bag strains, a white split down its middle, the first sparkles escaping.
    sack(g, { cx: CX, cy: CY + 1, rx: 7, ry: 6.5, twinkle: 0 });
    for (let y = 5; y <= 12; y++) plot(g, Math.round(CX - 0.5 + (y % 2)), y, 'w');
    glitter(g, 6, 7, 9, 1, 0);
  } else if (k === 1) {
    // The pop: a white-gold flash at the heart, shreds flying.
    disc(g, CX, CY, 4.5, (d) => (d < 1.6 ? 'w' : d < 3 ? '*' : '+'));
    shreds(g, 7, 0);
    glitter(g, 14, 5, 10, 2, 0);
  } else if (k === 2) {
    // The glitter cloud, dithered so it reads as a puff, shreds tumbling outward.
    disc(g, CX, CY, 5, (d, x, y) => ((x + y) % 2 === 0 && d > 1.5 ? 'P' : '.'));
    shreds(g, 9.5, 2);
    glitter(g, 18, 3, 11, 3, 1);
  } else if (k === 3) {
    glitter(g, 12, 4, 11, 4, 3);
    // The empty bag, limp on the ground.
    for (const [x, y, ch] of [
      [9, 20, 'J'],
      [10, 19, 'G'],
      [11, 19, 'H'],
      [12, 20, 'H'],
      [13, 19, 'G'],
      [14, 20, 'J'],
      [15, 20, 'I'],
      [11, 20, 'J'],
      [13, 20, 'H'],
      [10, 20, 'H'],
    ] as const)
      plot(g, x, y, ch);
  } else {
    glitter(g, 6, 5, 11, 5, 6);
    for (let x = 10; x <= 14; x++) plot(g, x, 20, x % 2 === 0 ? 'J' : 'I');
  }
  return rows(g);
}

export const fxSackBurst = defineSprite({
  id: 'fx.sack_burst',
  size: { w: W, h: H },
  anchor: { x: 12, y: 21 },
  palette: 'skitterkin',
  outline: 'auto',
  glow: { slots: ['e0', 'e1', 'hi'], radius: 2 },
  legend: SACK_LEGEND,
  frames: {
    f0: burst(0),
    f1: burst(1),
    f2: burst(2),
    f3: burst(3),
    f4: burst(4),
    young_0: burst(0, true),
  },
  anims: {
    burst: { frames: ['f0', 'f1', 'f2', 'f3', 'f4'], fps: 10, loop: false },
    burst_young: { frames: ['young_0', 'f1', 'f2', 'f3', 'f4'], fps: 10, loop: false },
  },
});
