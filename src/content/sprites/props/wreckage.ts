// Wreckage (`prop.wreckage`, design/maps.md § 3, tile `x`; art-direction § Tile readability): crashed
// Everglow debris on a scorched patch, standing on a wreckage tile until the salvage drone clears
// it. Act I's wreckage is the colony's own mishaps (maps.md § 7): `v0` a crashed delivery drone
// nose-down in the dirt, its rotor mast bent, its parcels spilled; `v1` a toppled lettuce cart,
// one wheel in the air, the crop rolled out. Both carry the "clear me" cue: an Everglow salvage
// stake (hazard-striped orange and ink) with a beacon on top, the same on every wreck, so
// wreckage reads as a job, never as decor.
//
// The scorched ground takes the act's env palette (path-dirt `s` steps and the shadow); the
// hardware is custom legend, so it keeps Everglow white, steel, teal, and orange in every act,
// like the pad's plate. Frames:
// - `v0`, `v1`: the wreck (render draws one per wreckage tile, chosen by the tile).
// - `v0_lit`, `v1_lit`: the beacon lit; the `blink_v0` / `blink_v1` anims trade it at 2 fps (queued),
//   and `idle_v0` / `idle_v1` wink it a quarter second in every two (untouched).
// - `v0_half`, `v1_half`: half cleared (the drone has lifted the big piece away; scraps and the
//   scorch remain), for the second half of a tile's clearing.
// A cleared tile draws its `underWreckage` tile and no prop.
import { defineSprite } from '../defineSprite.ts';
import {
  diamond,
  disc,
  grid,
  hash01,
  isoBox,
  line,
  plot,
  rows,
  stamp,
  type CharGrid,
} from '../helpers.ts';
import { ENV_VARIANTS } from '../tiles/tileGen.ts';

const W = 32;
const H = 30;
/** The top vertex of the tile's footprint diamond (the diamond fills the bottom 16 rows). */
const TOP = H - 16;

/**
 * The scorched patch the wreck lies in: a burnt `ink.1` heart, sooty grime round it, and a ragged
 * grime rim fading into the act's dirt, so the wreck reads as a crash site, not a placed object.
 */
function scorch(g: CharGrid, seed: number): void {
  for (let y = TOP; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = hash01(x, y, seed);
      const d = diamond(x, y - TOP) + (n - 0.5) * 1.6;
      if (d > 6.2) continue;
      let ch = '6';
      if (d < 2.8) ch = 'K';
      else if (d < 4.0) ch = n < 0.3 ? 'K' : 'J';
      else if (d < 5.2) ch = n < 0.5 ? 'J' : 'L';
      else ch = n < 0.45 ? 'L' : '6';
      plot(g, x, y, ch);
    }
  }
  // Grit: scraps of dead metal and dirt clods scattered on the patch.
  for (let k = 0; k < 7; k++) {
    const x = 6 + Math.floor(hash01(k, seed, 3) * 20);
    const y = TOP + 4 + Math.floor(hash01(seed, k, 4) * 8);
    if (diamond(x, y - TOP) < 5.5) plot(g, x, y, k % 3 === 0 ? 'T' : '7');
  }
}

/** Soot on the hardware: grime and ink flecks over the shell, heavier toward the burnt side. */
function soot(d: CharGrid, seed: number): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = d[y]?.[x] ?? '.';
      if (!'VWSTDE'.includes(ch)) continue;
      const r = hash01(x, y, seed + 9);
      const heavy = x > 13 ? 0.32 : 0.18;
      if (r < heavy * 0.4) plot(d, x, y, 'K');
      else if (r < heavy) plot(d, x, y, 'J');
    }
  }
}

/** A crack: carves a jagged 1 px gap (the outline pass fills it with ink) through the debris. */
function crack(d: CharGrid, pts: readonly (readonly [number, number])[]): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (a !== undefined && b !== undefined) line(d, a[0], a[1], b[0], b[1], '.');
  }
}

/** The salvage stake: a hazard-striped post with a beacon on top (lit or dark). */
function stake(g: CharGrid, x: number, y: number, lit: boolean): void {
  for (let t = 0; t < 10; t++) plot(g, x, y + t, Math.floor(t / 2) % 2 === 0 ? 'O' : 'K');
  plot(g, x + 1, y + 9, 'U');
  stamp(g, x, y - 2, lit ? ['YY', 'YY'] : ['ZZ', 'ZQ']);
  // A little pennant: Everglow teal.
  stamp(g, x + 1, y + 1, ['EE', 'D.']);
}

/** A crate of parcels, scuffed orange with a label. */
function crate(g: CharGrid, cx: number, cy: number, hw: number, h: number): void {
  // Dulled a step under the stake's orange, so the stake stays the brightest thing on the wreck.
  isoBox(g, cx, cy, hw, h, { top: 'Q', rim: 'Q', left: 'Z', right: 'B' });
  plot(g, Math.round(cx) - 1, Math.round(cy - h), 'W');
}

/** v0: a crashed delivery drone, nose-down, rotor mast bent, parcels spilled. */
function drone(g: CharGrid): void {
  // The capsule, tipped onto its side: a shaded white egg with a teal band and a dark visor.
  const cx = 14;
  const cy = TOP + 3;
  disc(g, cx, cy, 7.5, (d, x, y) => {
    const dy = (y + 0.5 - cy) * 1.5;
    if (Math.hypot(x + 0.5 - cx, dy) > 7.5) return '.';
    const lit = -(x + 0.5 - cx) - (y + 0.5 - cy);
    return lit > 4 ? 'V' : lit > -3 ? 'W' : d > 5 ? 'T' : 'S';
  });
  // Clean up the disc's square overshoot (disc paints its square; the egg is flatter).
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dy = (y + 0.5 - cy) * 1.5;
      if (Math.hypot(x + 0.5 - cx, dy) > 7.5 && 'VWTS'.includes(g[y]?.[x] ?? '.'))
        plot(g, x, y, '.');
    }
  }
  line(g, cx - 6, cy + 1, cx + 3, cy - 4, 'E');
  line(g, cx - 5, cy + 2, cx + 4, cy - 3, 'D');
  stamp(g, cx + 2, cy - 1, ['KKK', 'KDK', '.KK']);
  // A crack and a scorch on the shell.
  stamp(g, cx - 3, cy + 1, ['K.', '.K', 'K.']);
  // The rotor mast, bent up and back; the blade snapped off at the hub, a stub left on the mast.
  line(g, cx - 4, cy - 3, cx - 6, cy - 9, 'U');
  line(g, cx - 5, cy - 3, cx - 7, cy - 9, 'T');
  line(g, cx - 9, cy - 10, cx - 4, cy - 11, 'S');
  plot(g, cx - 6, cy - 10, 'T');
  // Its dead chime lamp on the crown (no glow).
  plot(g, cx + 4, cy - 5, 'T');
  plot(g, cx + 5, cy - 5, 'S');
  // The shell split open: a jagged crack from crown to belly.
  crack(g, [
    [cx + 1, cy - 5],
    [cx - 1, cy - 2],
    [cx + 1, cy + 1],
    [cx - 1, cy + 4],
  ]);
  soot(g, 1);
  // The snapped blade lies in the dirt beside the wreck.
  line(g, 3, TOP + 7, 8, TOP + 5, 'S');
  plot(g, 4, TOP + 7, 'T');
  // Spilled parcels.
  crate(g, 24, TOP + 9, 3.5, 3);
  crate(g, 7, TOP + 11, 2.5, 2);
}

/** v1: a toppled lettuce cart, one wheel in the air, the crop rolled out. */
function cart(g: CharGrid): void {
  // The cart on its side: a white box with a teal stripe, its open bed facing us.
  isoBox(g, 14, TOP + 7, 8, 7, { top: 'W', rim: 'V', left: 'S', right: 'T' });
  line(g, 7, TOP + 4, 14, TOP + 8, 'E');
  line(g, 7, TOP + 5, 14, TOP + 9, 'D');
  // The open bed, dark inside, with the last heads still in it.
  stamp(g, 15, TOP, ['.KKKK.', 'KKKKKK', 'KHGKKK', '.KKKK.']);
  // The wheel in the air, buckled: a dark tyre with a bite out of it round a steel hub.
  disc(g, 9, TOP - 4, 3, (d, x, y) => (x > 9 && y < TOP - 4 ? '.' : d > 2 ? 'K' : d > 1 ? 'U' : 'S'));
  plot(g, 9, TOP + 0, 'U');
  // The box split along its side, and sooted.
  crack(g, [
    [12, TOP + 1],
    [14, TOP + 4],
    [12, TOP + 7],
  ]);
  soot(g, 2);
  // The crop: heads of lettuce rolled out across the dirt.
  for (const [x, y] of [
    [22, TOP + 9],
    [25, TOP + 7],
    [19, TOP + 11],
    [6, TOP + 11],
  ] as const) {
    disc(g, x, y, 1.8, (d, px, py) => (d > 1.2 ? 'G' : (px + py) % 2 === 0 ? 'I' : 'H'));
  }
}

/** The half-cleared wreck: the big piece is gone; a few scraps, the parcels, and the stake. */
function half(g: CharGrid, v: 0 | 1): void {
  if (v === 0) {
    crate(g, 24, TOP + 9, 3.5, 3);
    stamp(g, 10, TOP + 5, ['.TS.', 'TWWS', '.TT.']);
  } else {
    disc(g, 22, TOP + 9, 1.8, (d) => (d > 1.2 ? 'G' : 'H'));
    stamp(g, 9, TOP + 5, ['..SW.', '.TWWS', 'KUTT.']);
  }
}

/** Rings the debris layer's pixels with a hand-placed ink outline (none round the scorch). */
function outlined(g: CharGrid, debris: CharGrid): void {
  const solid = (x: number, y: number): boolean => (debris[y]?.[x] ?? '.') !== '.';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))
        plot(g, x, y, 'N');
    }
  }
  debris.forEach((r, y) => r.forEach((ch, x) => ch !== '.' && plot(g, x, y, ch)));
}

function wreck(v: 0 | 1, state: 'dark' | 'lit' | 'half'): string[] {
  const g = grid(W, H);
  scorch(g, v + 1);
  const d = grid(W, H);
  if (state === 'half') half(d, v);
  else if (v === 0) drone(d);
  else cart(d);
  stake(d, v === 0 ? 27 : 26, v === 0 ? TOP - 6 : TOP - 5, state === 'lit');
  outlined(g, d);
  return rows(g);
}

export const propWreckage = defineSprite({
  id: 'prop.wreckage',
  size: { w: W, h: H },
  // The tile's center (props stand where towers do).
  anchor: { x: 16, y: TOP + 8 },
  palette: 'act1',
  variants: ENV_VARIANTS,
  // Outlined by hand: the debris gets an ink ring, the scorched patch none.
  outline: 'none',
  legend: {
    N: 'ink.0',
    // Dead hardware: the Everglow white and teal a step or two down, so a wreck never reads as
    // a tower (D097); only the salvage stake keeps its bright orange and beacon.
    W: 'steel.3',
    V: 'steel.4',
    S: 'steel.2',
    T: 'steel.1',
    U: 'steel.0',
    E: 'teal.1',
    D: 'teal.0',
    O: 'orange.3',
    Q: 'orange.2',
    Z: 'orange.1',
    Y: 'orange.4',
    K: 'ink.1',
    J: 'grime.1',
    L: 'grime.2',
    B: 'orange.0',
    G: 'green.2',
    H: 'green.3',
    I: 'green.4',
  },
  frames: {
    v0: wreck(0, 'dark'),
    v1: wreck(1, 'dark'),
    v0_lit: wreck(0, 'lit'),
    v1_lit: wreck(1, 'lit'),
    v0_half: wreck(0, 'half'),
    v1_half: wreck(1, 'half'),
  },
  anims: {
    blink_v0: { frames: ['v0', 'v0_lit'], fps: 2 },
    blink_v1: { frames: ['v1', 'v1_lit'], fps: 2 },
    // Untouched: a slow idle wink (lit a quarter second in every two), so a wreck still says
    // "job here" without pulling the eye like a queued one (well under 3 Hz).
    idle_v0: { frames: ['v0', 'v0', 'v0', 'v0', 'v0', 'v0', 'v0', 'v0_lit'], fps: 4 },
    idle_v1: { frames: ['v1', 'v1', 'v1', 'v1', 'v1', 'v1', 'v1', 'v1_lit'], fps: 4 },
  },
});
